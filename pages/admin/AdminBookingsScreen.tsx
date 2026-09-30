
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus, Customer, Mechanic } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Calendar, Clock, CheckCircle, XCircle, DollarSign, Users, Download, Eye, Edit, Trash2, ArrowUpDown, ChevronDown, Search, ShieldCheck, ExternalLink, X, Wrench, MapPin, Phone, Navigation, Truck, Sparkles, ChevronRight, Car, UserCheck, FileText, AlertTriangle, Activity, TrendingUp, Zap, Filter, CalendarDays, CalendarRange, Check, Tag, Maximize2, Route, Compass, MessageSquare, SlidersHorizontal, Fuel, Gauge, KeyRound, ArrowRight } from 'lucide-react';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import MapComponent, { MapMarker, MapPolyline } from '../../components/MapComponent';
import CustomerMechanicChatModal from '../../components/customer/CustomerMechanicChatModal';
import { ref, onValue } from 'firebase/database';
import { rtdb, db as firestoreDB } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getFallbackImageForCategory } from '../../utils/fallbackImages';
import { getProfileImage, getCustomerAvatar, MOCKUPS } from '../../utils/imageConstants';
import Tooltip from '../../components/ui/Tooltip';
import { RIDERSBUD_STORE_LOCATION } from '../../utils/locationHelper';

declare const L: any;

type SortableKeys = 'id' | 'customerName' | 'mechanicName' | 'date' | 'price';

const parseDateTime = (dateStr: string, timeStr: string): number => {
    if (!dateStr) return 0;
    
    // Check if dateStr is a full ISO date-time string
    if (dateStr.includes('T') || (dateStr.includes(':') && dateStr.includes('-'))) {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) return parsed;
    }
    
    // Normalize date string (expected: YYYY-MM-DD or MM/DD/YYYY)
    let year = 2026, month = 0, day = 1;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1; // 0-indexed
            day = parseInt(parts[2], 10);
        }
    } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10) - 1;
                day = parseInt(parts[2], 10);
            } else {
                month = parseInt(parts[0], 10) - 1;
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            }
        }
    } else {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
            const d = new Date(parsed);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        }
    }
    
    // Normalize time string (expected: HH:mm or HH:mm AM/PM or H:mm)
    let hours = 0, minutes = 0;
    const cleanTime = (timeStr || '00:00').trim().toUpperCase();
    const match12 = cleanTime.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    const match24 = cleanTime.match(/^(\d+):(\d+)$/);
    
    if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const ampm = match12[3];
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
    }
    
    return new Date(year, month, day, hours, minutes).getTime();
};

const getTimelineData = (status: BookingStatus, statusHistory?: { status: BookingStatus; timestamp: string }[]) => {
    const history = statusHistory ? [...statusHistory] : [];
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.status !== status) {
        history.push({
            status,
            timestamp: new Date().toISOString()
        });
    }
    return history;
};

const statusColors: Record<string, string> = {
    'Upcoming': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Booking Confirmed': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'Mechanic Assigned': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'En Route': 'bg-primary/15 text-primary border-primary/30',
    'In Progress': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'Work Done': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Reschedule Requested': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'On Hold': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Received': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Booking Received': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'LTO Processing': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Dispatched': 'bg-primary/15 text-primary border-primary/30',
    'Assigned': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const QuickActionButton: React.FC<{
    icon: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    variant?: 'primary' | 'danger' | 'success';
    tooltip?: string;
}> = ({ icon, onClick, variant = 'primary', tooltip }) => {
    const variantClasses = {
        primary: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30',
        danger: 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30',
        success: 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30',
    };

    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-lg border transition-all duration-200 ${variantClasses[variant]} group relative`}
            title={tooltip}
        >
            {icon}
            {tooltip && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {tooltip}
                </span>
            )}
        </button>
    );
};

const BookingDetailsModal: React.FC<{ booking: Booking; customer?: Customer, onClose: () => void; }> = ({ booking, customer, onClose }) => {
    return (
        <Modal title={`Booking Details #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                {/* Service & Price */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 to-orange-900/10 p-8 rounded-[2rem] border border-primary/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <DollarSign size={100} className="text-primary" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-primary font-black  tracking-widest text-xs mb-4 flex items-center gap-2">
                            <DollarSign size={16} /> Service & Price
                        </h3>
                        {(() => {
                            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                            const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
                            const addCosts = (booking.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
                            const total = originalServicesFee + addCosts;
                            const dur = svcs.map(s => s.estimatedTime).filter(Boolean).join(' + ') || 'N/A';
                            return (
                                <>
                                    {svcs.length > 1 ? (
                                        <ul className="space-y-1 mb-2">
                                            {svcs.map((s, i) => <li key={i} className="text-lg font-black text-white">• {s.name}</li>)}
                                        </ul>
                                    ) : (
                                        <p className="text-3xl font-black text-white tracking-tight">{svcs[0]?.name || 'Unknown Service'}</p>
                                    )}
                                    <div className="flex items-baseline gap-3 mt-2">
                                        <p className="text-5xl font-black text-primary">{total > 0 ? `₱${total.toLocaleString()}` : 'For Quotation'}</p>
                                        <span className="text-gray-400 font-bold text-sm">Est: {dur}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Customer & Vehicle Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs mb-4 flex items-center gap-2">
                            <Users size={16} /> Customer Profile
                        </h3>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-white">{customer?.name || booking.customerName}</p>
                            <p className="text-sm font-bold text-gray-400">{customer?.email || 'No email provided'}</p>
                            <p className="text-sm font-bold text-gray-500">{customer?.phone || 'No phone provided'}</p>
                        </div>
                    </div>
                    <div className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs mb-4 flex items-center gap-2">
                            <CheckCircle size={16} /> Vehicle Details
                        </h3>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-white">{booking.vehicle?.year || ''} {booking.vehicle?.make || ''} {booking.vehicle?.model || 'Unknown Vehicle'}</p>
                            <div className="inline-flex bg-white/10 px-3 py-1 rounded-lg text-xs font-mono font-bold text-white mt-1 border border-white/5">
                                {booking.vehicle?.plateNumber || 'No Plate'}
                            </div>
                            {booking.vehicle.vin && <p className="text-xs font-bold text-gray-600 mt-2 tracking-wider">VIN: {booking.vehicle.vin}</p>}
                        </div>
                    </div>
                </div>

                {/* Mechanic Info */}
                <div className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs">Assigned Mechanic</h3>
                        {!booking.mechanic && <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg text-[10px] font-black ">Pending Assignment</span>}
                    </div>

                    {booking.mechanic ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black text-white">
                                {booking.mechanic.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-black text-white">{booking.mechanic.name}</p>
                                <p className="text-xs font-bold text-gray-500 mt-0.5">{booking.mechanic.email}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-yellow-400 font-black text-sm flex items-center gap-1">
                                    ⭐ {booking.mechanic.rating}
                                </p>
                                <p className="text-[10px] font-bold text-gray-600  tracking-wider">{booking.mechanic.reviews} Reviews</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 font-bold text-sm">No mechanic has been assigned to this booking yet.</p>
                    )}
                </div>

                {/* Payment & Status Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5">
                        <h3 className="text-gray-500 font-black tracking-widest text-xs mb-2">Payment Status</h3>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {booking.isPaid ? (
                                    <>
                                        <div className="p-2 bg-green-500 rounded-full shadow-lg shadow-green-500/20"><CheckCircle size={20} className="text-white" /></div>
                                        <div>
                                            <p className="font-black text-white">Payment Received (100%)</p>
                                            <p className="text-xs text-green-500 font-bold tracking-wider">Fully Confirmed</p>
                                        </div>
                                    </>
                                ) : booking.isVerified || booking.paymentStatus === 'downpayment_paid' || (booking.paidAmount && booking.paidAmount > 0) ? (
                                    <>
                                        <div className="p-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"><CheckCircle size={20} className="text-white" /></div>
                                        <div>
                                            <p className="font-black text-white">50% Downpayment Verified</p>
                                            <p className="text-xs text-emerald-400 font-bold tracking-wider">{booking.paymentMethod?.includes('HitPay') ? 'HitPay Online Gateway' : 'GCash Verified'}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/20"><Clock size={20} className="text-white" /></div>
                                        <div>
                                            <p className="font-black text-white">{booking.paymentStatus === 'partial' ? 'Partial (50%)' : 'Payment Pending'}</p>
                                            <p className="text-xs text-yellow-500 font-bold tracking-wider">{booking.paymentMethod === 'GCash' ? 'GCash Verification Needed' : 'Awaiting Downpayment'}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {booking.gcashReceiptUrl && (
                                <a 
                                    href={booking.gcashReceiptUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-xl border border-primary/20 transition-all group scale-90"
                                >
                                    <Eye size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black tracking-tighter">View Receipt</span>
                                </a>
                            )}
                        </div>

                        {/* Reference details */}
                        {(booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference || booking.balancePaymentRef) && (
                            <div className="pt-2 border-t border-white/5 space-y-1 text-xs">
                                <div className="flex justify-between text-gray-400">
                                    <span>Method:</span>
                                    <span className="font-bold text-white">{booking.paymentMethod || 'HitPay Online'}</span>
                                </div>
                                {(booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference) && (
                                    <div className="flex justify-between text-gray-400">
                                        <span>DP Ref:</span>
                                        <span className="font-mono text-primary font-bold">{booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference}</span>
                                    </div>
                                )}
                                {booking.downpaymentPaidAt && (
                                    <div className="flex justify-between text-gray-400 text-[10px]">
                                        <span>Paid At:</span>
                                        <span className="font-mono text-gray-300">{new Date(booking.downpaymentPaidAt).toLocaleString()}</span>
                                    </div>
                                )}
                                {booking.balancePaymentRef && (
                                    <div className="flex justify-between text-gray-400">
                                        <span>Balance Ref:</span>
                                        <span className="font-mono text-emerald-400 font-bold">{booking.balancePaymentRef}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5">
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs mb-2">Current Status</h3>
                        <p className="text-xl font-black text-white">{booking.status}</p>
                        <p className="text-xs font-bold text-gray-500  tracking-widest mt-1">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Status Timeline */}
                {booking.statusHistory && booking.statusHistory.length > 0 && (
                    <div className="bg-[#1A1A1A] p-8 rounded-[2rem] border border-white/5">
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs mb-6 flex items-center gap-2">
                            <Clock size={16} /> Service Timeline
                        </h3>
                        <div className="space-y-0">
                            {booking.statusHistory.map((s, i) => (
                                <div key={i} className="flex gap-4 relative group">
                                    {/* Line */}
                                    {i !== booking.statusHistory!.length - 1 && (
                                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-white/5 group-hover:bg-primary/50 transition-colors"></div>
                                    )}

                                    {/* Dot */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 z-10 transition-all ${i === booking.statusHistory!.length - 1 ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-[#121212] border-white/10 text-gray-500'}`}>
                                        <CheckCircle size={16} />
                                    </div>

                                    <div className="pb-8">
                                        <p className={`font-black text-sm ${i === booking.statusHistory!.length - 1 ? 'text-white' : 'text-gray-400'}`}>{s.status}</p>
                                        <p className="text-[10px] font-bold text-gray-600  tracking-widest mt-1">{new Date(s.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cancellation Reason */}
                {booking.cancellationReason && (
                    <div className="bg-red-500/10 p-6 rounded-[2rem] border border-red-500/20">
                        <h3 className="text-red-400 font-black  tracking-widest text-xs mb-2 flex items-center gap-2">
                            <XCircle size={16} /> Cancellation Details
                        </h3>
                        <p className="text-white font-medium leading-relaxed">{booking.cancellationReason}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const PriceBreakdownModal: React.FC<{
    booking: Booking;
    onClose: () => void;
}> = ({ booking, onClose }) => {
    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
    const originalServicesTotal = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
    const initialDeposit = (booking.downpaymentAmount != null && Number(booking.downpaymentAmount) > 0)
        ? Number(booking.downpaymentAmount)
        : (booking.isVerified ? originalServicesTotal * 0.5 : 0);
    
    const additionalCosts = (booking as any).additionalCosts || [];
    const additionalCostsTotal = additionalCosts.reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
    
    const totalAmount = originalServicesTotal + additionalCostsTotal;
    const remainingBalance = Math.max(0, totalAmount - initialDeposit);
    const isFullyPaid = Boolean(booking.isPaid);

    const downpaymentReceipt = booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl || (booking as any).downpaymentReceiptUrl;
    const downpaymentRef = booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference || (booking as any).downpaymentReference;
    const finalReceipt = booking.gcashBalanceReceiptUrl || (booking as any).balanceReceiptUrl;
    const finalRef = booking.balancePaymentRef || booking.gcashBalanceReference;

    return (
        <Modal 
            title={
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                        Price Breakdown
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-gray-300">
                            #{booking.id.slice(-6).toUpperCase()}
                        </span>
                    </h2>
                    <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">
                        Booking Status: {booking.status}
                    </span>
                </div>
            }
            isOpen={true} 
            onClose={onClose}
            compact={true}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Services & Additional Costs */}
                <div className="space-y-4">
                    {/* Original Services */}
                    <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Original Services</h4>
                        <div className="space-y-2">
                            {svcs.map((svc, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5 text-xs">
                                    <div className="flex items-center gap-3">
                                        {svc.imageUrl ? (
                                            <img 
                                                src={svc.imageUrl} 
                                                alt={svc.name} 
                                                className="w-8 h-8 rounded-lg object-cover" 
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-gray-500 shrink-0">
                                                <Wrench size={14} />
                                            </div>
                                        )}
                                        <span className="text-gray-300 font-bold">{svc.name}</span>
                                    </div>
                                    <span className="text-white font-mono">{svc.price > 0 ? `₱${svc.price.toLocaleString()}` : 'For Quotation'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional Costs */}
                    <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
                        {additionalCosts.length > 0 ? (
                            <div>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Wrench size={10} /> Additional Costs Added by Mechanic
                                </h4>
                                <div className="space-y-2">
                                    {additionalCosts.map((cost: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-primary/5 p-2.5 rounded-lg border border-primary/10 text-xs">
                                            <span className="text-gray-300 font-bold">{cost.description || 'Additional Item'}</span>
                                            <span className="text-primary font-mono font-bold">₱{Number(cost.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Wrench size={10} /> Additional Costs
                                </h4>
                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-center">
                                    <span className="text-[10px] text-gray-500 font-bold">No additional costs added by mechanic.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: GCash Receipts & Totals */}
                <div className="space-y-4">
                    {booking.paymentMethod === 'GCash' && (
                        <div className="space-y-2 border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                GCash Payment Receipts
                            </h4>
                            <div className="grid grid-cols-2 gap-3.5">
                                {/* Downpayment Card */}
                                <div className="border border-white/5 bg-[#121212] rounded-lg p-2.5 flex flex-col items-center justify-center text-center gap-2">
                                    <span className="text-[9px] text-gray-400 font-bold">Downpayment (50%)</span>
                                    {downpaymentReceipt ? (
                                        <a 
                                            href={downpaymentReceipt} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="group relative w-full aspect-video rounded bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center"
                                        >
                                            <img 
                                                src={downpaymentReceipt} 
                                                alt="Downpayment Receipt" 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-bold text-white">
                                                View Original
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="w-full aspect-video rounded bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center">
                                            <span className="text-[8px] text-gray-600 font-bold">Awaiting Upload</span>
                                        </div>
                                    )}
                                    {downpaymentRef && (
                                        <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded select-all truncate max-w-full">
                                            Ref: {downpaymentRef}
                                        </span>
                                    )}
                                </div>

                                {/* Final Payment Card */}
                                <div className="border border-white/5 bg-[#121212] rounded-lg p-2.5 flex flex-col items-center justify-center text-center gap-2">
                                    <span className="text-[9px] text-gray-400 font-bold">Final Payment</span>
                                    {finalReceipt ? (
                                        <a 
                                            href={finalReceipt} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="group relative w-full aspect-video rounded bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center"
                                        >
                                            <img 
                                                src={finalReceipt} 
                                                alt="Final Payment Receipt" 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-bold text-white">
                                                View Original
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="w-full aspect-video rounded bg-[#181818] border border-dashed border-white/10 flex flex-col items-center justify-center">
                                            <span className="text-[8px] text-gray-600 font-bold">Awaiting Upload</span>
                                        </div>
                                    )}
                                    {finalRef && (
                                        <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded select-all truncate max-w-full">
                                            Ref: {finalRef}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Totals */}
                    <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3.5 space-y-2.5">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Totals Summary</h4>
                        <div className="flex justify-between text-xs font-medium pt-1">
                                <span className="text-gray-400">Services Subtotal</span>
                                <span className="text-white">{originalServicesTotal > 0 ? `₱${originalServicesTotal.toLocaleString()}` : 'For Quotation'}</span>
                            </div>
                            {additionalCostsTotal > 0 && (
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-400">Additional Costs Total</span>
                                    <span className="text-primary font-bold">+₱{additionalCostsTotal.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black uppercase text-white tracking-wider">Grand Total Price</span>
                                <span className="text-sm font-black text-white">{totalAmount > 0 ? `₱${totalAmount.toLocaleString()}` : 'For Quotation'}</span>
                            </div>

                            <div className="h-px bg-white/5 my-2"></div>

                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-gray-400">Paid Down Payment (50% Deposit)</span>
                                <span className="text-emerald-400 font-bold">{initialDeposit > 0 ? `₱${initialDeposit.toLocaleString()}` : '—'}</span>
                            </div>
                            <div className={`flex justify-between items-center p-2.5 rounded-xl border ${isFullyPaid ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {isFullyPaid ? 'Final Payment (Settled)' : 'Final Payment Due'}
                                </span>
                                <span className={`text-sm font-black ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {remainingBalance > 0 ? `₱${remainingBalance.toLocaleString()}` : 'For Quotation'}
                                </span>
                            </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 mt-4">
                <button onClick={onClose} className="bg-admin-border text-white font-bold py-2 px-6 rounded-xl hover:bg-gray-600 transition text-xs">
                    Close
                </button>
            </div>
        </Modal>
    );
};

const CancellationModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ booking, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation.');
            return;
        }
        setError('');
        onConfirm(reason);
    };

    return (
        <Modal title={`Cancel Booking #${booking.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <p>Please provide a reason for cancelling the booking for <span className="font-bold text-admin-accent">{booking.customerName}</span>.</p>
                <textarea
                    id="cancellationReason"
                    name="cancellationReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Customer request, mechanic unavailable..."
                    rows={4}
                    className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${error ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-admin-border text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Go Back</button>
                    <button onClick={handleConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition">Confirm Cancellation</button>
                </div>
            </div>
        </Modal>
    );
};


const MechanicAssignmentModal: React.FC<{
    booking: Booking;
    mechanics: Mechanic[];
    onClose: () => void;
    onAssign: (mechanic: Mechanic) => void;
}> = ({ booking, mechanics, onClose, onAssign }) => {
    return (
        <Modal title={`Assign Mechanic to Booking #${booking.id.slice(-6)}`} isOpen={true} onClose={onClose} compact={true}>
            <div className="space-y-4">
                <p className="text-xs text-gray-400">Select a professional to handle this service for <span className="text-white font-bold">{booking.customerName}</span>.</p>
                <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {mechanics.filter(m => m.status === 'Active').map(mechanic => (
                        <div
                            key={mechanic.id}
                            className="bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 hover:border-primary/50 transition-all group relative"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="relative shrink-0">
                                    {mechanic.imageUrl ? (
                                        <img 
                                            src={getProfileImage(mechanic.imageUrl, 'mechanic')} 
                                            alt={mechanic.name} 
                                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" 
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-lg font-black text-primary shrink-0">
                                            {mechanic.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#121212] ${mechanic.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-white group-hover:text-primary transition-colors text-sm truncate">{mechanic.name}</p>
                                        {mechanic.verificationStatus === 'verified' && (
                                            <span className="bg-primary/20 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Verified</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold tracking-wide truncate mt-0.5">
                                        {mechanic.specializations?.join(', ') || mechanic.specialties?.join(', ') || 'Professional Mechanic'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500 font-bold">
                                        <span>{mechanic.phone}</span>
                                        <span>•</span>
                                        <span className="truncate">{mechanic.email}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0 gap-1.5">
                                    <div className="text-right">
                                        <p className="text-yellow-400 font-black text-xs">⭐ {Number(mechanic.rating || 0).toFixed(1)}</p>
                                        <p className="text-[9px] text-gray-500 font-bold">{mechanic.reviews || 0} Reviews</p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onAssign(mechanic); }}
                                        className="px-3 py-1.5 bg-[#FF7903] hover:bg-[#e06800] text-white text-[9px] font-black tracking-widest uppercase rounded-lg transition-all"
                                    >
                                        Assign
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-3 border-t border-white/5">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white/5 text-gray-400 font-black tracking-widest text-[9px] rounded-lg hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                </div>
            </div>
        </Modal>
    );
};


const BookingLocationModal: React.FC<{ booking: Booking; onClose: () => void }> = ({ booking, onClose }) => {
    const { db } = useDatabase();
    const [customerLiveLocation, setCustomerLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [time, setTime] = useState<number>(0);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

    // Detect if this booking is for Car Rental
    const isRentalBooking = useMemo(() => {
        return !!(booking.isRental || 
                 booking.services?.[0]?.category === 'Car Rental' || 
                 booking.service?.category === 'Car Rental' ||
                 (booking as any).carObj);
    }, [booking]);

    // By default, BOTH TAB is active for all services (Car Rental, Driver for Hire, Towing, Liaison, Mechanic)
    const [activeViewMode, setActiveViewMode] = useState<'both' | 'mechanic' | 'customer'>('both');

    const customerObj = useMemo(() => {
        return db.customers.find(c => c.name === booking.customerName || c.id === booking.customerId);
    }, [db.customers, booking.customerName, booking.customerId]);

    const mechanicObj = useMemo(() => {
        return db.mechanics.find(m => m.id === booking.mechanicId || (booking.mechanic && m.id === booking.mechanic.id));
    }, [db.mechanics, booking.mechanicId, booking.mechanic]);

    const isDriverService = useMemo(() => {
        return (booking.services?.[0]?.category === 'Driver for Hire') || 
               (booking.service?.category === 'Driver for Hire') || 
               (booking.services?.[0]?.name?.toLowerCase().includes('driver')) ||
               (!!booking.driverName && !booking.mechanicId);
    }, [booking]);

    const driverObj = useMemo(() => {
        return (booking as any).driverObj || (db.hireDrivers || []).find(d => d.name === booking.driverName || d.id === (booking as any).driverId);
    }, [db.hireDrivers, booking.driverName, (booking as any).driverId, (booking as any).driverObj]);

    // Rental car object resolution
    const rentalCarObj = useMemo(() => {
        if ((booking as any).carObj) return (booking as any).carObj;
        const carId = (booking as any).carId || booking.services?.[0]?.id;
        return (db.rentalCars || []).find(c => c.id === carId);
    }, [booking, db.rentalCars]);

    // Live movement tick for simulated active routes
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(prev => prev + 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Ensure markers re-render immediately once Leaflet is ready
    const [leafletReady, setLeafletReady] = useState(typeof window !== 'undefined' && !!(window as any).L);
    useEffect(() => {
        if (leafletReady) return;
        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && (window as any).L) {
                setLeafletReady(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [leafletReady]);

    // Subscribe to real-time Firebase RTDB tracking
    useEffect(() => {
        if (!booking.id) return;
        const customerRef = ref(rtdb, `tracking/${booking.id}/customerLocation`);
        const mechanicRef = ref(rtdb, `tracking/${booking.id}/mechanicLocation`);

        const unsubCustomer = onValue(customerRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const lat = Number(val.lat);
                const lng = Number(val.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setCustomerLiveLocation({ lat, lng });
                }
            }
        }, (error) => {
            console.warn("Realtime customer tracking blocked or unavailable:", error);
        });

        const unsubMechanic = !isRentalBooking ? onValue(mechanicRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const lat = Number(val.lat);
                const lng = Number(val.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setMechanicLiveLocation({ lat, lng });
                }
            }
        }, (error) => {
            console.warn("Realtime mechanic tracking blocked or unavailable:", error);
        }) : () => {};

        return () => {
            unsubCustomer();
            unsubMechanic();
        };
    }, [booking.id, isRentalBooking]);

    // Resolve HQ Origin Coordinates (From Settings with Fallback to Carmona Central Hub)
    const hqLat = Number(db?.settings?.storeLatitude ?? RIDERSBUD_STORE_LOCATION.lat);
    const hqLng = Number(db?.settings?.storeLongitude ?? RIDERSBUD_STORE_LOCATION.lng);
    const hqName = db?.settings?.storeName || RIDERSBUD_STORE_LOCATION.name;
    const hqAddress = db?.settings?.address || db?.settings?.storeAddress || RIDERSBUD_STORE_LOCATION.address;

    // Detect specialized HQ-origin services
    const isLiaisonService = useMemo(() => {
        return !!(booking.services?.[0]?.category === 'Liaison' || 
                 booking.service?.category === 'Liaison' ||
                 (booking as any).liaisonType ||
                 booking.services?.[0]?.name?.toLowerCase().includes('liaison'));
    }, [booking]);

    const isTowingService = useMemo(() => {
        return !!(booking.services?.[0]?.category === 'Towing' || 
                 booking.service?.category === 'Towing' ||
                 booking.services?.[0]?.name?.toLowerCase().includes('towing') ||
                 booking.service?.name?.toLowerCase().includes('towing') ||
                 (booking as any).isTowing);
    }, [booking]);

    const isHqOriginService = useMemo(() => {
        return isRentalBooking || isDriverService || isLiaisonService || isTowingService;
    }, [isRentalBooking, isDriverService, isLiaisonService, isTowingService]);

    // Base customer coordinate with exhaustive fallback discovery
    const rawCustLat = booking.location 
        ? Number((booking.location as any).latitude ?? (booking.location as any).lat) 
        : (booking as any).details?.startCoords?.[0] != null 
            ? Number((booking as any).details.startCoords[0])
            : (booking as any).pickupLocationCoords?.lat != null
                ? Number((booking as any).pickupLocationCoords.lat)
                : customerObj?.lat != null
                    ? Number(customerObj.lat)
                    : NaN;

    const rawCustLng = booking.location 
        ? Number((booking.location as any).longitude ?? (booking.location as any).lng) 
        : (booking as any).details?.startCoords?.[1] != null 
            ? Number((booking as any).details.startCoords[1])
            : (booking as any).pickupLocationCoords?.lng != null
                ? Number((booking as any).pickupLocationCoords.lng)
                : customerObj?.lng != null
                    ? Number(customerObj.lng)
                    : NaN;

    const baseLat = (!isNaN(rawCustLat) && rawCustLat !== 0) ? rawCustLat : 14.291457;
    const baseLng = (!isNaN(rawCustLng) && rawCustLng !== 0) ? rawCustLng : 121.001210;

    const currentCustomerCoord = customerLiveLocation || (!isNaN(baseLat) && !isNaN(baseLng) ? { lat: baseLat, lng: baseLng } : null);
    
    // Origin coordinates: Live mechanic/driver if actively transmitting or assigned, otherwise default HQ Location
    const currentMechanicCoord = useMemo(() => {
        if (mechanicLiveLocation) return mechanicLiveLocation;
        if (mechanicObj?.lat && mechanicObj?.lng) return { lat: Number(mechanicObj.lat), lng: Number(mechanicObj.lng) };
        if (booking.mechanic?.lat && booking.mechanic?.lng) return { lat: Number(booking.mechanic.lat), lng: Number(booking.mechanic.lng) };
        if (driverObj?.lat && driverObj?.lng) return { lat: Number(driverObj.lat), lng: Number(driverObj.lng) };

        // For specialized services originating from HQ (Car Rental, Towing, Liaison, Driver for Hire), adopt default HQ
        if (isHqOriginService) {
            return { lat: hqLat, lng: hqLng };
        }

        if (!isNaN(baseLat) && !isNaN(baseLng)) {
            // Simulated position with animated pulse for other on-site mechanic services
            return {
                lat: baseLat + 0.0035 + Math.sin(time / 5000) * 0.0006,
                lng: baseLng + 0.0035 + Math.cos(time / 5000) * 0.0006
            };
        }
        return { lat: hqLat, lng: hqLng };
    }, [mechanicLiveLocation, mechanicObj, booking.mechanic, driverObj, isHqOriginService, hqLat, hqLng, baseLat, baseLng, time]);

    // Determine if the origin is currently displaying the HQ Central Hub
    const isDisplayingHq = useMemo(() => {
        if (!currentMechanicCoord) return false;
        const isLiveAssigned = Boolean(mechanicLiveLocation || mechanicObj?.lat || booking.mechanic?.lat || driverObj?.lat);
        return !isLiveAssigned && isHqOriginService;
    }, [currentMechanicCoord, mechanicLiveLocation, mechanicObj, booking.mechanic, driverObj, isHqOriginService]);

    // Road route state between customer & mechanic/driver
    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
    const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
    const [roadDurationMins, setRoadDurationMins] = useState<number | null>(null);
    const [isRoutingActive, setIsRoutingActive] = useState<boolean>(false);

    // Fetch accurate driving road route from OSRM with safe geodesic fallback
    useEffect(() => {
        if (!currentCustomerCoord || !currentMechanicCoord) {
            setRouteGeometry([]);
            setRoadDistanceKm(null);
            setRoadDurationMins(null);
            setIsRoutingActive(false);
            return;
        }

        let isSubscribed = true;
        const custLat = currentCustomerCoord.lat;
        const custLng = currentCustomerCoord.lng;
        const mechLat = currentMechanicCoord.lat;
        const mechLng = currentMechanicCoord.lng;

        // Fallback straight path
        const straightCoords: [number, number][] = [
            [mechLat, mechLng],
            [custLat, custLng]
        ];

        const latDiff = custLat - mechLat;
        const lngDiff = custLng - mechLng;
        const approxKm = Math.max(0.1, parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1)));
        const fallbackMins = Math.max(2, Math.round(approxKm * 2.8));

        const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${mechLng},${mechLat};${custLng},${custLat}?overview=full&geometries=geojson`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        fetch(osrmUrl, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (!isSubscribed) return;
                if (data && data.routes && data.routes.length > 0) {
                    const primary = data.routes[0];
                    const pts: [number, number][] = (primary.geometry?.coordinates || []).map((c: any) => [c[1], c[0]]);
                    if (pts.length > 0) {
                        setRouteGeometry(pts);
                        setRoadDistanceKm(parseFloat((primary.distance / 1000).toFixed(1)));
                        setRoadDurationMins(Math.max(1, Math.round(primary.duration / 60)));
                        setIsRoutingActive(true);
                        return;
                    }
                }
                setRouteGeometry(straightCoords);
                setRoadDistanceKm(approxKm);
                setRoadDurationMins(fallbackMins);
                setIsRoutingActive(false);
            })
            .catch(() => {
                if (!isSubscribed) return;
                setRouteGeometry(straightCoords);
                setRoadDistanceKm(approxKm);
                setRoadDurationMins(fallbackMins);
                setIsRoutingActive(false);
            });

        return () => {
            isSubscribed = false;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [currentCustomerCoord?.lat, currentCustomerCoord?.lng, currentMechanicCoord?.lat, currentMechanicCoord?.lng]);

    // Distance & ETA calculation with live road routing prioritised
    const distanceKm = useMemo(() => {
        if (roadDistanceKm !== null) return roadDistanceKm;
        if (!currentCustomerCoord || !currentMechanicCoord) return 2.4;
        const R = 6371; // Earth radius in km
        const dLat = (currentMechanicCoord.lat - currentCustomerCoord.lat) * Math.PI / 180;
        const dLon = (currentMechanicCoord.lng - currentCustomerCoord.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(currentCustomerCoord.lat * Math.PI / 180) * Math.cos(currentMechanicCoord.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.max(0.1, Number((R * c).toFixed(1)));
    }, [roadDistanceKm, currentCustomerCoord, currentMechanicCoord]);

    const estimatedMins = useMemo(() => {
        if (roadDurationMins !== null) return roadDurationMins;
        return Math.max(2, Math.round(distanceKm * 2.8));
    }, [roadDurationMins, distanceKm]);

    // Construct high-precision route polylines
    const mapPolylines = useMemo(() => {
        const polylines: MapPolyline[] = [];
        if (activeViewMode !== 'both' && activeViewMode !== 'mechanic') return polylines;
        if (!routeGeometry || routeGeometry.length < 2) return polylines;

        // 1. Glowing outer border for contrast on dark tiles
        polylines.push({
            id: `route-glow-${booking.id}`,
            positions: routeGeometry,
            color: '#FE7803',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // 2. High-definition inner core route path
        polylines.push({
            id: `route-core-${booking.id}`,
            positions: routeGeometry,
            color: '#FE7803',
            weight: 4,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
        });

        return polylines;
    }, [activeViewMode, routeGeometry, booking.id]);

    // Map markers
    const mapMarkers = useMemo(() => {
        const markers: MapMarker[] = [];
        if (typeof L === 'undefined') return markers;

        const customerPic = customerObj?.picture || (booking as any).customerPhoto || '';
        const mechanicPic = mechanicObj?.imageUrl || booking.mechanic?.imageUrl || driverObj?.imageUrl || '';
        const mapAppLogo = db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png';
        const clientInitial = (booking.customerName || 'C').charAt(0).toUpperCase();

        // Customer icon with guaranteed fallback
        const customerIcon = L.divIcon({
            html: `
                <div class="rb-map-pin-wrapper">
                    <div class="rb-pin-circle" style="border: 3.5px solid #3B82F6; background: #0f172a; box-shadow: 0 4px 18px rgba(59, 130, 246, 0.65); width: 44px; height: 44px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${customerPic ? `
                            <img src="${customerPic}" alt="Customer" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-weight:900;font-size:14px;color:#3B82F6;\\'>${clientInitial}</span>';" style="width:100%;height:100%;object-fit:cover;" />
                        ` : isRentalBooking ? `
                            <span style="font-size:18px;">🚗</span>
                        ` : `
                            <div style="font-weight:900;font-size:14px;color:#3B82F6;">
                                ${clientInitial}
                            </div>
                        `}
                    </div>
                    <div class="rb-pin-stem" style="background: #3B82F6; width: 3px; height: 18px; margin: 0 auto;"></div>
                    <div class="rb-pin-dot" style="background: #3B82F6; width: 7px; height: 7px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 10px #3B82F6;"></div>
                </div>
            `,
            className: 'rb-leaflet-icon',
            iconSize: [44, 70],
            iconAnchor: [22, 70],
            popupAnchor: [0, -74]
        });

        // Specialist icon (Mechanic / Driver) with guaranteed fallback
        const specialistIcon = L.divIcon({
            html: `
                <div class="rb-map-pin-wrapper">
                    <div class="rb-pin-circle" style="border: 3.5px solid #FE7803; background: #18181b; box-shadow: 0 4px 18px rgba(254, 120, 3, 0.65); width: 44px; height: 44px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${mechanicPic ? `
                            <img src="${mechanicPic}" alt="Specialist" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-weight:900;font-size:14px;color:#FE7803;\\'>${(isDriverService ? (booking.driverName || 'D') : (booking.mechanic?.name || 'M')).charAt(0).toUpperCase()}</span>';" style="width:100%;height:100%;object-fit:cover;" />
                        ` : `
                            <div style="font-weight:900;font-size:14px;color:#FE7803;">
                                ${(isDriverService ? (booking.driverName || 'D') : (booking.mechanic?.name || 'M')).charAt(0).toUpperCase()}
                            </div>
                        `}
                    </div>
                    <div class="rb-pin-stem" style="background: #FE7803; width: 3px; height: 18px; margin: 0 auto;"></div>
                    <div class="rb-pin-dot" style="background: #FE7803; width: 7px; height: 7px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 8px #FE7803;"></div>
                </div>
            `,
            className: 'rb-leaflet-icon',
            iconSize: [44, 70],
            iconAnchor: [22, 70],
            popupAnchor: [0, -74]
        });

        // Show customer / rental location pin
        if (currentCustomerCoord && (activeViewMode === 'both' || activeViewMode === 'customer')) {
            let activeCustomerIcon = customerIcon;
            let popupHtml = `
                <div class="p-2 text-center font-bold text-xs min-w-[190px]">
                    <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1">
                        <span>📍 Customer Location</span>
                    </div>
                    <div class="text-white font-black text-sm mt-1">${booking.customerName}</div>
                    <div class="text-gray-300 text-xs mt-1 leading-snug">${(booking as any).pickupLocation || booking.location?.address || 'Service Destination'}</div>
                </div>
            `;

            if (isRentalBooking) {
                const rentalAddress = (booking as any).pickupLocation || booking.location?.address || 'Confirmed Service Location';
                const carLabel = (booking as any).carObj ? `${(booking as any).carObj.make} ${(booking as any).carObj.model}` : (booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Rental Vehicle');

                activeCustomerIcon = L.divIcon({
                    html: `
                        <div class="rb-map-pin-wrapper">
                            <div class="rb-pin-circle" style="border: 3.5px solid #3B82F6; background: #0f172a; box-shadow: 0 4px 22px rgba(59, 130, 246, 0.75); width: 48px; height: 48px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                ${customerPic ? `
                                    <img src="${customerPic}" alt="Client" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:20px;\\'>🚗</span>';" style="width:100%;height:100%;object-fit:cover;" />
                                ` : `
                                    <span style="font-size:20px;">🚗</span>
                                `}
                            </div>
                            <div class="rb-pin-stem" style="background: #3B82F6; width: 3.5px; height: 20px; margin: 0 auto;"></div>
                            <div class="rb-pin-dot" style="background: #3B82F6; width: 7px; height: 7px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 10px #3B82F6;"></div>
                        </div>
                    `,
                    className: 'rb-leaflet-icon',
                    iconSize: [48, 74],
                    iconAnchor: [24, 74],
                    popupAnchor: [0, -78]
                });

                popupHtml = `
                    <div class="p-2 text-center font-bold text-xs min-w-[210px]">
                        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1">
                            <span>📍 Client Pick-up Location</span>
                        </div>
                        <div class="text-white font-black text-sm mt-1">${carLabel}</div>
                        <div class="text-gray-200 text-xs mt-1 font-semibold leading-relaxed">${rentalAddress}</div>
                        <div class="mt-2 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                            <span class="text-gray-400">Client:</span>
                            <span class="text-blue-400 font-mono font-bold">${booking.customerName}</span>
                        </div>
                    </div>
                `;
            }

            markers.push({
                id: 'customerPin',
                position: [currentCustomerCoord.lat, currentCustomerCoord.lng],
                popupContent: popupHtml,
                icon: activeCustomerIcon
            });
        }

        // Show Specialist / Origin / HQ Pin for all services including Car Rental
        if (currentMechanicCoord && (activeViewMode === 'both' || activeViewMode === 'mechanic')) {
            const originTitle = isDisplayingHq 
                ? 'RidersBUD Central HQ' 
                : isDriverService 
                    ? 'Driver (Live)' 
                    : isTowingService 
                        ? 'Towing Unit' 
                        : isLiaisonService 
                            ? 'Liaison Officer' 
                            : 'Mechanic (Live)';

            const originSubtitle = isDisplayingHq 
                ? hqName 
                : isDriverService 
                    ? (booking.driverName || 'Assigned Driver') 
                    : (booking.mechanic?.name || 'Assigned Specialist');

            const originAddressText = isDisplayingHq ? hqAddress : 'Live Dispatched Specialist';

            // Distinctive HQ / Specialist marker icon with guaranteed fallback
            const originMarkerIcon = isDisplayingHq ? L.divIcon({
                html: `
                    <div class="rb-map-pin-wrapper">
                        <div class="rb-pin-circle" style="border: 3.5px solid #FE7803; background: #18181b; box-shadow: 0 4px 22px rgba(254, 120, 3, 0.75); width: 48px; height: 48px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${mapAppLogo}" alt="RidersBUD HQ" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:20px;\\'>🏬</span>';" style="width:28px;height:28px;object-fit:contain;" />
                        </div>
                        <div class="rb-pin-stem" style="background: #FE7803; width: 3.5px; height: 20px; margin: 0 auto;"></div>
                        <div class="rb-pin-dot" style="background: #FE7803; width: 7px; height: 7px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 10px #FE7803;"></div>
                    </div>
                `,
                className: 'rb-leaflet-icon',
                iconSize: [48, 74],
                iconAnchor: [24, 74],
                popupAnchor: [0, -78]
            }) : specialistIcon;

            markers.push({
                id: 'specialistPin',
                position: [currentMechanicCoord.lat, currentMechanicCoord.lng],
                popupContent: `
                    <div class="p-2 text-center font-bold text-xs min-w-[200px]">
                        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FE7803]/20 text-[#FE7803] text-[10px] font-black uppercase tracking-wider mb-1">
                            <span>${isDisplayingHq ? '🏬 Dispatch Origin' : '⚡ Live Active Unit'}</span>
                        </div>
                        <div class="text-white font-black text-sm mt-1">${originTitle}</div>
                        <div class="text-gray-300 text-xs mt-0.5 font-semibold">${originSubtitle}</div>
                        <div class="text-gray-400 text-[10px] mt-1 border-t border-white/10 pt-1 leading-snug">${originAddressText}</div>
                    </div>
                `,
                icon: originMarkerIcon
            });
        }

        return markers;
    }, [currentCustomerCoord, currentMechanicCoord, activeViewMode, customerObj, mechanicObj, driverObj, booking, isDriverService, isRentalBooking, isDisplayingHq, isTowingService, isLiaisonService, hqName, hqAddress, db?.settings, leafletReady]);

    // Center point based on view mode
    const mapCenter: [number, number] = useMemo(() => {
        if (activeViewMode === 'customer' && currentCustomerCoord) {
            return [currentCustomerCoord.lat, currentCustomerCoord.lng];
        }
        if (activeViewMode === 'mechanic' && currentMechanicCoord) {
            return [currentMechanicCoord.lat, currentMechanicCoord.lng];
        }
        if (currentCustomerCoord && currentMechanicCoord) {
            return [(currentCustomerCoord.lat + currentMechanicCoord.lat) / 2, (currentCustomerCoord.lng + currentMechanicCoord.lng) / 2];
        }
        if (currentCustomerCoord) return [currentCustomerCoord.lat, currentCustomerCoord.lng];
        if (currentMechanicCoord) return [currentMechanicCoord.lat, currentMechanicCoord.lng];
        return [14.291457, 121.001210];
    }, [activeViewMode, currentCustomerCoord, currentMechanicCoord]);

    // Zoom level based on view mode
    const mapZoom = useMemo(() => {
        if (activeViewMode === 'customer' || activeViewMode === 'mechanic') {
            return 16;
        }
        return 14;
    }, [activeViewMode]);

    // Map bounds
    const mapBounds = useMemo(() => {
        if (typeof L === 'undefined') return undefined;
        if (activeViewMode === 'both') {
            const pointsToFit: [number, number][] = [];
            if (currentCustomerCoord) pointsToFit.push([currentCustomerCoord.lat, currentCustomerCoord.lng]);
            if (currentMechanicCoord) pointsToFit.push([currentMechanicCoord.lat, currentMechanicCoord.lng]);
            if (routeGeometry && routeGeometry.length > 0) {
                pointsToFit.push(...routeGeometry);
            }

            if (pointsToFit.length >= 2) {
                return L.latLngBounds(pointsToFit);
            }
        }
        return undefined;
    }, [activeViewMode, currentCustomerCoord, currentMechanicCoord, routeGeometry]);

    // Service & Payment details
    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
    const serviceName = svcs.map(s => s.name).join(', ') || 'General Service';
    const originalServicesFee = svcs.reduce((sum, s) => sum + (Number(s.price) || 0), 0) || (Number(booking.totalAmount) || 0);
    const addCosts = (booking.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
    const totalFee = originalServicesFee + addCosts;
    const depositAmount = (booking as any).downpaymentAmount ? Number((booking as any).downpaymentAmount) : (booking as any).isInitialDownpaymentPaid ? Math.round(originalServicesFee * 0.5) : Math.round(totalFee * 0.5);
    const finalPaymentAmount = Math.max(0, totalFee - depositAmount);

    // Active customer entity for chat modal
    const chatCustomerData = useMemo(() => {
        return customerObj || {
            id: booking.customerId || 'cust_' + booking.id,
            name: booking.customerName || 'Customer',
            email: (booking as any).customerEmail || 'N/A',
            phone: (booking as any).customerPhone || customerObj?.phone || 'N/A',
            picture: (booking as any).customerPhoto || customerObj?.picture || ''
        } as Customer;
    }, [customerObj, booking]);

    // Active mechanic entity for chat modal
    const chatMechanicData = useMemo(() => {
        return mechanicObj || (booking.mechanic ? {
            ...booking.mechanic,
            id: booking.mechanic.id || booking.mechanicId || 'mech_' + booking.id,
            name: booking.mechanic.name || 'Assigned Mechanic',
            email: (booking.mechanic as any).email || 'N/A',
            phone: (booking.mechanic as any).phone || 'N/A'
        } as Mechanic : {
            id: booking.mechanicId || 'mech_' + booking.id,
            name: isDriverService ? (booking.driverName || 'Assigned Driver') : (booking.mechanic?.name || 'Assigned Mechanic'),
            email: 'N/A',
            phone: (booking as any).driverPhone || 'N/A',
            specialty: 'General Specialist'
        } as any as Mechanic);
    }, [mechanicObj, booking, isDriverService]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="relative w-full max-w-5xl bg-[#121214] border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header Bar */}
                <div className="px-5 py-3.5 border-b border-white/10 bg-[#16161a] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 p-0.5 flex items-center justify-center shadow-lg shadow-primary/20">
                            <div className="w-full h-full bg-[#121214] rounded-[14px] flex items-center justify-center text-primary">
                                <Navigation size={18} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                                    {isRentalBooking ? 'Client Live Location & Vehicle Rental' : isLiaisonService ? 'Liaison Real-time Location & Client Tracking' : 'Real-time Location & Live Tracking'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    isRentalBooking 
                                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                                        : isLiaisonService
                                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isRentalBooking ? 'bg-blue-400' : isLiaisonService ? 'bg-cyan-400' : 'bg-emerald-400'} animate-ping`}></span>
                                    {isRentalBooking ? 'Client GPS Active' : isLiaisonService ? 'Live GPS Active' : 'Live GPS'}
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-semibold mt-1">
                                Booking Reference: <span className="font-mono text-white font-black">{booking.id}</span> • {booking.date} {booking.time ? `at ${formatTimeToAmPm(booking.time)}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 flex items-center justify-center transition-all active:scale-95"
                            aria-label="Close modal"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Modal Main Body Grid: Map on Left + Transaction Details on Right without vertical outer scrolling */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                    {/* Left: Interactive Map Container (7 columns on large screens) */}
                    <div className="lg:col-span-7 flex flex-col min-h-[350px] lg:min-h-[520px] relative border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0d0d0f]">
                        {/* Floating Live Telemetry Badge & Tab Switcher Inline (Top Left of Map) */}
                        <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-none">
                            {/* Estimated Travel / Route Telemetry Badge */}
                            <div className="bg-[#141418]/95 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <div>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                                            {isDisplayingHq ? 'HQ Dispatch Route' : 'Estimated Travel'}
                                        </p>
                                        <p className="text-xs font-black text-white leading-tight mt-0.5">{distanceKm} km • ~{estimatedMins} mins</p>
                                    </div>
                                </div>
                                <div className="h-5 w-px bg-white/10 hidden sm:block"></div>
                                <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    isRoutingActive 
                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                }`}>
                                    {isRoutingActive ? 'Road Route' : 'Direct Line'}
                                </span>
                            </div>

                            {/* View Switcher Segmented Control (Inline with Travel Badge) */}
                            <div className="bg-[#141418]/95 backdrop-blur-md border border-white/15 p-1 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-1">
                                <button
                                    onClick={() => setActiveViewMode('both')}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        activeViewMode === 'both' ? 'bg-primary text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Both
                                </button>
                                <button
                                    onClick={() => setActiveViewMode('mechanic')}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        activeViewMode === 'mechanic' ? 'bg-primary text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {isDisplayingHq ? 'HQ Hub' : isDriverService ? 'Driver' : isTowingService ? 'Towing' : isLiaisonService ? 'Liaison' : 'Mechanic'}
                                </button>
                                <button
                                    onClick={() => setActiveViewMode('customer')}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        activeViewMode === 'customer' ? 'bg-primary text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Client
                                </button>
                            </div>
                        </div>

                        {/* Map Component */}
                        <div className="flex-1 w-full h-full min-h-[350px]">
                            <MapComponent
                                center={mapCenter}
                                zoom={mapZoom}
                                markers={mapMarkers}
                                polylines={mapPolylines}
                                bounds={mapBounds}
                            />
                        </div>
                    </div>

                    {/* Right: Comprehensive Transaction Details Panel (5 columns on large screens) */}
                    <div className="lg:col-span-5 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 bg-[#141417] overflow-y-auto lg:overflow-visible">
                        
                        {/* 1. Service Header & Status Card */}
                        <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                    <Wrench size={12} className="text-primary" /> Service Category
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${statusColors[booking.status] || 'bg-white/10 text-white border-white/20'}`}>
                                    {booking.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img
                                        src={(booking as any).carImage || rentalCarObj?.imageUrl || booking.service?.imageUrl || getFallbackImageForCategory(booking.service?.category)}
                                        alt={serviceName}
                                        className="w-full h-full object-cover rounded-lg"
                                        onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(booking.service?.category); }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-black text-white truncate leading-snug">{serviceName}</h4>
                                    <p className="text-[11px] text-primary font-bold mt-0.5 flex items-center gap-1.5">
                                        <span>₱{totalFee.toLocaleString()} Total Value</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-gray-400 font-normal">
                                            {isRentalBooking ? ((booking as any).vehicleDesc || 'Rental Agreement') : (booking.service?.estimatedTime || '1-2 hrs est.')}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Customer & Vehicle Details Card */}
                        <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                            <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                <Users size={12} className="text-blue-400" /> Customer Information
                            </span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30 overflow-hidden">
                                        {customerObj?.picture ? (
                                            <img 
                                                src={customerObj.picture} 
                                                alt="" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    if (img.src !== MOCKUPS.DEFAULT_AVATAR) {
                                                        img.src = MOCKUPS.DEFAULT_AVATAR;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            booking.customerName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white">{booking.customerName}</p>
                                        <p className="text-[10px] text-gray-400">{customerObj?.phone || (booking as any).customerPhone || 'No phone provided'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {(customerObj?.phone || (booking as any).customerPhone) && (
                                        <a
                                            href={`tel:${customerObj?.phone || (booking as any).customerPhone}`}
                                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                            <Phone size={11} /> Call
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setIsChatOpen(true)}
                                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                        title="Open Chat with Customer"
                                    >
                                        <MessageSquare size={12} />
                                        <span>Chat</span>
                                    </button>
                                </div>
                            </div>
                            <div className="p-1.5 sm:p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <Car size={13} className="text-primary" />
                                    <span className="text-gray-300 font-bold text-[11px]">
                                        {booking.vehicle ? `${booking.vehicle.year || ''} ${booking.vehicle.make || ''} ${booking.vehicle.model || ''}`.trim() : 'Selected Vehicle'}
                                    </span>
                                </div>
                                {booking.vehicle?.plateNumber && (
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-primary font-mono text-[10px] font-black border border-white/10">
                                        {booking.vehicle.plateNumber}
                                    </span>
                                )}
                            </div>

                            {/* Customer Realtime Location & GPS Details */}
                            <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin size={11} className="text-blue-400" />
                                        Customer Realtime Location
                                    </span>
                                    {currentCustomerCoord && (
                                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                                            {currentCustomerCoord.lat.toFixed(5)}, {currentCustomerCoord.lng.toFixed(5)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-200 font-semibold leading-snug">
                                    {(booking as any).pickupLocation || (booking.location as any)?.address || (booking as any).details?.pickupLocation || customerObj?.address || 'Cavite Service Hub / Client Location'}
                                </p>
                            </div>
                        </div>

                        {/* 3. Assigned Specialist OR Selected Rental Vehicle */}
                        {isRentalBooking ? (
                            <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                        <Car size={12} className="text-primary" /> Selected Rental Car
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider border border-primary/20">
                                        {(booking as any).deliveryOption || 'Self Pickup'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        <img 
                                            src={(booking as any).carImage || rentalCarObj?.imageUrl || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'} 
                                            alt={rentalCarObj?.model || 'Rental Car'} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-white truncate">
                                            {rentalCarObj ? `${rentalCarObj.make} ${rentalCarObj.model} (${rentalCarObj.year})` : (booking.services?.[0]?.name || 'Rental Vehicle')}
                                        </p>
                                        <p className="text-[10px] font-mono text-primary font-bold mt-0.5">
                                            Plate: {rentalCarObj?.plateNumber || booking.vehicle?.plateNumber || 'TBD'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded font-black text-[9px] border ${
                                                (booking as any).includeDriver
                                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                            }`}>
                                                {(booking as any).includeDriver ? '★ With Driver' : '✓ Self Drive'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300">
                                                {rentalCarObj?.transmission || 'Automatic'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300">
                                                {rentalCarObj?.seats || 5} Seats
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300">
                                                {rentalCarObj?.type || 'SUV'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <MapPin size={11} className="text-primary" /> Confirmed Service Location:
                                        </span>
                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                            Live Pin
                                        </span>
                                    </div>
                                    <p className="text-xs font-black text-white leading-tight break-words" title={(booking as any).pickupLocation || booking.location?.address}>
                                        {(booking as any).pickupLocation || booking.location?.address || 'Main Branch Office'}
                                    </p>
                                    {booking.location && (typeof (booking.location as any).latitude === 'number' || typeof (booking.location as any).lat === 'number') && (
                                        <p className="text-[9px] font-mono text-gray-500">
                                            GPS: {((booking.location as any).latitude ?? (booking.location as any).lat).toFixed(5)}, {((booking.location as any).longitude ?? (booking.location as any).lng).toFixed(5)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : isLiaisonService ? (
                            <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                    <UserCheck size={12} className="text-cyan-400" /> Liaison Officer & LTO Branch
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                                            <FileText size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-white truncate">
                                                {(booking as any).agentName || (booking as any).liaisonName || 'Assigned Liaison Officer'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                Branch: {(booking as any).branchName || 'LTO District Office'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-wider shrink-0">
                                        Active Duty
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                    <UserCheck size={12} className="text-amber-400" /> Assigned Mechanic
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                                            {(isDriverService ? (booking.driverName || 'D') : (booking.mechanic?.name || 'M')).charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-white truncate">
                                                {isDriverService ? (booking.driverName || driverObj?.name || 'Unassigned Driver') : (booking.mechanic?.name || mechanicObj?.name || 'Unassigned Mechanic')}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {isDriverService ? 'Professional Driver' : (mechanicObj?.specialty || 'General Mechanic Specialist')}
                                            </p>
                                        </div>
                                    </div>
                                    {(mechanicObj?.phone || (booking as any).driverPhone) && (
                                        <a
                                            href={`tel:${mechanicObj?.phone || (booking as any).driverPhone}`}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                            <Phone size={11} /> Call
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. Complete Payment Breakdown */}
                        <div className="bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                                    <DollarSign size={12} className="text-emerald-400" /> Payment Breakdown
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                    booking.isPaid ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}>
                                    {booking.isPaid ? 'Fully Settled' : 'Deposit Settled / Balance Due'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">1st Payment (50%)</p>
                                    <p className="text-sm font-black text-emerald-400 mt-0.5">₱{depositAmount.toLocaleString()}</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5 truncate">{booking.paymentMethod || 'HitPay Online'}</p>
                                </div>
                                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Final Payment</p>
                                    <p className={`text-sm font-black mt-0.5 ${finalPaymentAmount === 0 || booking.isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        ₱{finalPaymentAmount.toLocaleString()}
                                    </p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">{finalPaymentAmount === 0 || booking.isPaid ? 'Paid & Completed' : 'Upon Completion'}</p>
                                </div>
                            </div>

                            {/* Reference IDs */}
                            <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                                <span>Reference ID:</span>
                                <span className="font-mono text-white font-bold truncate max-w-[180px]">
                                    {(booking as any).hitpayReference || (booking as any).downpaymentReference || booking.gcashReference || booking.id.slice(-10)}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-white/10 bg-[#16161a] flex items-center justify-between flex-shrink-0">
                    <span className="text-[11px] text-gray-400 font-medium">
                        {isRentalBooking 
                            ? 'Client live GPS stream active • Visualizing client location & rental details' 
                            : 'Real-time location stream active • Auto-refreshes with driver updates'}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all active:scale-95"
                    >
                        Close Window
                    </button>
                </div>
            </div>

            {/* Fully Functional Chat Modal */}
            {isChatOpen && (
                <CustomerMechanicChatModal
                    booking={booking}
                    customer={chatCustomerData}
                    mechanic={chatMechanicData}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

interface LiveMapCardProps {
    booking: Booking;
}

const LiveMapCard: React.FC<LiveMapCardProps> = ({ booking }) => {
    const { db } = useDatabase();
    const [customerLiveLocation, setCustomerLiveLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [time, setTime] = useState<number>(0);

    const customerObj = useMemo(() => {
        return db.customers.find(c => c.name === booking.customerName || c.id === booking.customerId);
    }, [db.customers, booking.customerName, booking.customerId]);

    const mechanicObj = useMemo(() => {
        return db.mechanics.find(m => m.id === booking.mechanicId || (booking.mechanic && m.id === booking.mechanic.id));
    }, [db.mechanics, booking.mechanicId, booking.mechanic]);

    const isDriverService = useMemo(() => {
        return (booking.services?.[0]?.category === 'Driver for Hire') || 
               (booking.service?.category === 'Driver for Hire') || 
               (booking.services?.[0]?.name?.toLowerCase().includes('driver')) ||
               (!!booking.driverName && !booking.mechanicId);
    }, [booking]);

    const driverObj = useMemo(() => {
        return (booking as any).driverObj || (db.hireDrivers || []).find(d => d.name === booking.driverName || d.id === (booking as any).driverId);
    }, [db.hireDrivers, booking.driverName, (booking as any).driverId, (booking as any).driverObj]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(prev => prev + 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Ensure Leaflet reactivity in LiveMapCard
    const [leafletReady, setLeafletReady] = useState(typeof window !== 'undefined' && !!(window as any).L);
    useEffect(() => {
        if (leafletReady) return;
        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && (window as any).L) {
                setLeafletReady(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [leafletReady]);

    useEffect(() => {
        if (!booking.id) return;
        const customerRef = ref(rtdb, `tracking/${booking.id}/customerLocation`);
        const mechanicRef = ref(rtdb, `tracking/${booking.id}/mechanicLocation`);

        const unsubCustomer = onValue(customerRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const lat = Number(val.lat);
                const lng = Number(val.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setCustomerLiveLocation({ lat, lng });
                }
            }
        });

        const unsubMechanic = onValue(mechanicRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                const lat = Number(val.lat);
                const lng = Number(val.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setMechanicLiveLocation({ lat, lng });
                }
            }
        });

        return () => {
            unsubCustomer();
            unsubMechanic();
        };
    }, [booking.id]);

    // Detect if this booking is for Car Rental
    const isRentalBooking = useMemo(() => {
        return !!(booking.isRental || 
                 booking.services?.[0]?.category === 'Car Rental' || 
                 booking.service?.category === 'Car Rental' ||
                 (booking as any).carObj);
    }, [booking]);

    // Resolve HQ Origin Coordinates (From Settings with Fallback to Carmona Central Hub)
    const hqLat = Number(db?.settings?.storeLatitude ?? RIDERSBUD_STORE_LOCATION.lat);
    const hqLng = Number(db?.settings?.storeLongitude ?? RIDERSBUD_STORE_LOCATION.lng);
    const hqName = db?.settings?.storeName || RIDERSBUD_STORE_LOCATION.name;
    const hqAddress = db?.settings?.address || db?.settings?.storeAddress || RIDERSBUD_STORE_LOCATION.address;

    // Detect specialized HQ-origin services
    const isLiaisonService = useMemo(() => {
        return !!(booking.services?.[0]?.category === 'Liaison' || 
                 booking.service?.category === 'Liaison' ||
                 (booking as any).liaisonType ||
                 booking.services?.[0]?.name?.toLowerCase().includes('liaison'));
    }, [booking]);

    const isTowingService = useMemo(() => {
        return !!(booking.services?.[0]?.category === 'Towing' || 
                 booking.service?.category === 'Towing' ||
                 booking.services?.[0]?.name?.toLowerCase().includes('towing') ||
                 booking.service?.name?.toLowerCase().includes('towing') ||
                 (booking as any).isTowing);
    }, [booking]);

    const isHqOriginService = useMemo(() => {
        return isRentalBooking || isDriverService || isLiaisonService || isTowingService;
    }, [isRentalBooking, isDriverService, isLiaisonService, isTowingService]);

    // Base customer coordinate with exhaustive fallback discovery
    const rawCustLat = booking.location 
        ? Number((booking.location as any).latitude ?? (booking.location as any).lat) 
        : (booking as any).details?.startCoords?.[0] != null 
            ? Number((booking as any).details.startCoords[0])
            : (booking as any).pickupLocationCoords?.lat != null
                ? Number((booking as any).pickupLocationCoords.lat)
                : customerObj?.lat != null
                    ? Number(customerObj.lat)
                    : NaN;

    const rawCustLng = booking.location 
        ? Number((booking.location as any).longitude ?? (booking.location as any).lng) 
        : (booking as any).details?.startCoords?.[1] != null 
            ? Number((booking as any).details.startCoords[1])
            : (booking as any).pickupLocationCoords?.lng != null
                ? Number((booking as any).pickupLocationCoords.lng)
                : customerObj?.lng != null
                    ? Number(customerObj.lng)
                    : NaN;

    const baseLat = (!isNaN(rawCustLat) && rawCustLat !== 0) ? rawCustLat : 14.291457;
    const baseLng = (!isNaN(rawCustLng) && rawCustLng !== 0) ? rawCustLng : 121.001210;

    const currentCustomerCoord = customerLiveLocation || (!isNaN(baseLat) && !isNaN(baseLng) ? { lat: baseLat, lng: baseLng } : null);

    // Mechanic / Driver / HQ coordinate resolution
    const currentMechanicCoord = useMemo(() => {
        if (mechanicLiveLocation) return mechanicLiveLocation;
        if (mechanicObj?.lat && mechanicObj?.lng) return { lat: Number(mechanicObj.lat), lng: Number(mechanicObj.lng) };
        if (booking.mechanic?.lat && booking.mechanic?.lng) return { lat: Number(booking.mechanic.lat), lng: Number(booking.mechanic.lng) };
        if (driverObj?.lat && driverObj?.lng) return { lat: Number(driverObj.lat), lng: Number(driverObj.lng) };

        // For specialized services originating from HQ (Car Rental, Towing, Liaison, Driver for Hire), adopt default HQ
        if (isHqOriginService) {
            return { lat: hqLat, lng: hqLng };
        }

        // If booking is active or assigned, generate smooth real-time simulated coordinate
        if (!isNaN(baseLat) && !isNaN(baseLng)) {
            const isCompleted = booking.status === 'Completed';
            const offset = isCompleted ? 0.0002 : 0.0035;
            return {
                lat: baseLat + offset + (isCompleted ? 0 : Math.sin(time / 5000) * 0.0006),
                lng: baseLng + offset + (isCompleted ? 0 : Math.cos(time / 5000) * 0.0006)
            };
        }
        return { lat: hqLat, lng: hqLng };
    }, [mechanicLiveLocation, mechanicObj, booking.mechanic, driverObj, isHqOriginService, hqLat, hqLng, baseLat, baseLng, booking.status, time]);

    const isDisplayingHq = useMemo(() => {
        if (!currentMechanicCoord) return false;
        const isLiveAssigned = Boolean(mechanicLiveLocation || mechanicObj?.lat || booking.mechanic?.lat || driverObj?.lat);
        return !isLiveAssigned && isHqOriginService;
    }, [currentMechanicCoord, mechanicLiveLocation, mechanicObj, booking.mechanic, driverObj, isHqOriginService]);

    const mapMarkers = useMemo(() => {
        const markers: MapMarker[] = [];
        if (typeof L === 'undefined') return markers;

        const customerPic = customerObj?.picture || (booking as any).customerPhoto || '';
        const mechanicPic = mechanicObj?.imageUrl || booking.mechanic?.imageUrl || driverObj?.imageUrl || '';
        const specialistName = isDriverService ? (booking.driverName || driverObj?.name || 'Assigned Driver') : (booking.mechanic?.name || mechanicObj?.name || 'Assigned Mechanic');
        const clientInitial = (booking.customerName || 'C').charAt(0).toUpperCase();

        // Distinct High-definition Customer / Client Pin (Electric Blue)
        const customerIcon = L.divIcon({
            html: `
                <div class="rb-map-pin-wrapper">
                    <div class="rb-pin-circle" style="border: 3px solid #3B82F6; background: #0f172a; box-shadow: 0 4px 18px rgba(59, 130, 246, 0.7); width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${customerPic ? `
                            <img src="${customerPic}" alt="Customer" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-weight:900;font-size:13px;color:#3B82F6;\\'>${clientInitial}</span>';" style="width:100%;height:100%;object-fit:cover;" />
                        ` : isRentalBooking ? `
                            <span style="font-size: 16px;">🚗</span>
                        ` : `
                            <div style="font-weight:900;font-size:13px;color:#3B82F6;">
                                ${clientInitial}
                            </div>
                        `}
                    </div>
                    <div class="rb-pin-stem" style="background: #3B82F6; width: 3px; height: 16px; margin: 0 auto;"></div>
                    <div class="rb-pin-dot" style="background: #3B82F6; width: 6px; height: 6px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 10px #3B82F6;"></div>
                </div>
            `,
            className: 'rb-leaflet-icon',
            iconSize: [40, 64],
            iconAnchor: [20, 64],
            popupAnchor: [0, -68]
        });

        // High-definition Specialist Pin (Mechanic / Driver)
        const specialistIcon = L.divIcon({
            html: `
                <div class="rb-map-pin-wrapper pulse-available">
                    <div class="rb-pin-circle" style="border: 3px solid #FE7803; background: #121212; box-shadow: 0 4px 16px rgba(254, 120, 3, 0.6); width: 38px; height: 38px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${mechanicPic ? `
                            <img src="${mechanicPic}" alt="Specialist" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-weight:900;font-size:12px;color:#FE7803;\\'>${(isDriverService ? (booking.driverName || 'D') : (booking.mechanic?.name || 'M')).charAt(0).toUpperCase()}</span>';" style="width:100%;height:100%;object-fit:cover;" />
                        ` : `
                            <div style="font-weight:900;font-size:12px;color:#FE7803;">
                                ${(isDriverService ? (booking.driverName || 'D') : (booking.mechanic?.name || 'M')).charAt(0).toUpperCase()}
                            </div>
                        `}
                    </div>
                    <div class="rb-pin-stem" style="background: #FE7803; width: 3px; height: 16px; margin: 0 auto;"></div>
                    <div class="rb-pin-dot" style="background: #FE7803; width: 6px; height: 6px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 8px #FE7803;"></div>
                </div>
            `,
            className: 'rb-leaflet-icon',
            iconSize: [40, 64],
            iconAnchor: [20, 64],
            popupAnchor: [0, -68]
        });

        // Destination Pin for Driver for Hire services
        const destLoc = (booking as any).destinationLocation;
        if (destLoc) {
            const destLat = Number(destLoc.latitude || destLoc.lat);
            const destLng = Number(destLoc.longitude || destLoc.lng);
            if (!isNaN(destLat) && !isNaN(destLng)) {
                const destIcon = L.divIcon({
                    html: `
                        <div class="rb-map-pin-wrapper">
                            <div class="rb-pin-circle" style="border: 3px solid #10B981; background: #121212; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 13px;">🏁</span>
                            </div>
                            <div class="rb-pin-stem" style="background: #10B981; width: 2.5px; height: 14px; margin: 0 auto;"></div>
                            <div class="rb-pin-dot" style="background: #10B981; width: 5px; height: 5px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 6px #10B981;"></div>
                        </div>
                    `,
                    className: 'rb-leaflet-icon',
                    iconSize: [36, 56],
                    iconAnchor: [18, 56],
                    popupAnchor: [0, -60]
                });

                markers.push({
                    id: 'destinationLocation',
                    position: [destLat, destLng],
                    popupContent: `<div class="p-1 text-center font-bold text-xs"><span class="text-emerald-400">Destination</span><br/>${destLoc.address || 'Drop-off'}</div>`,
                    icon: destIcon
                });
            }
        }

        // 1. Customer / Rental Service Location Marker (Always Blue Client Pin)
        if (currentCustomerCoord) {
            let popupHtml = `<div class="p-1 text-center font-bold text-xs"><span class="text-blue-400">Customer</span><br/>${booking.customerName}</div>`;

            if (isRentalBooking) {
                const rentalAddress = (booking as any).pickupLocation || booking.location?.address || 'Confirmed Service Location';
                const carLabel = (booking as any).carObj ? `${(booking as any).carObj.make} ${(booking as any).carObj.model}` : (booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Rental Vehicle');

                popupHtml = `
                    <div class="p-1.5 text-center font-bold text-xs min-w-[160px]">
                        <div class="flex items-center justify-center gap-1 text-[10px] text-blue-400 uppercase font-black tracking-wider">
                            <span>📍 Client Pick-up Location</span>
                        </div>
                        <div class="text-white font-extrabold mt-1 text-[11px]">${carLabel}</div>
                        <div class="text-gray-300 text-[10px] mt-0.5 leading-tight">${rentalAddress}</div>
                        <div class="mt-1 text-[9px] text-blue-400 font-mono">Client: ${booking.customerName}</div>
                    </div>
                `;
            }

            markers.push({
                id: 'customerLocation',
                position: [currentCustomerCoord.lat, currentCustomerCoord.lng],
                popupContent: popupHtml,
                icon: customerIcon
            });
        }

        // 2. Mechanic / Driver / HQ Dispatch Marker (RidersBUD Orange)
        if (currentMechanicCoord) {
            const originTitle = isDisplayingHq 
                ? 'RidersBUD Central HQ' 
                : isDriverService 
                    ? 'Driver' 
                    : isTowingService 
                        ? 'Towing' 
                        : isLiaisonService 
                            ? 'Liaison' 
                            : 'Mechanic';

            const originSubtitle = isDisplayingHq 
                ? hqName 
                : specialistName;

            const mapAppLogo = db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png';
            const originMarkerIcon = isDisplayingHq ? L.divIcon({
                html: `
                    <div class="rb-map-pin-wrapper">
                        <div class="rb-pin-circle" style="border: 3px solid #FE7803; background: #121212; box-shadow: 0 4px 18px rgba(254, 120, 3, 0.7); width: 42px; height: 42px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${mapAppLogo}" alt="RidersBUD HQ" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:18px;\\'>🏬</span>';" style="width:24px;height:24px;object-fit:contain;" />
                        </div>
                        <div class="rb-location-stem" style="background: #FE7803; width: 3px; height: 16px; margin: 0 auto;"></div>
                        <div class="rb-location-dot" style="background: #FE7803; width: 6px; height: 6px; border-radius: 50%; margin: -2px auto 0; box-shadow: 0 0 10px #FE7803;"></div>
                    </div>
                `,
                className: 'rb-leaflet-icon',
                iconSize: [42, 66],
                iconAnchor: [21, 66],
                popupAnchor: [0, -68]
            }) : specialistIcon;

            markers.push({
                id: 'specialistLocation',
                position: [currentMechanicCoord.lat, currentMechanicCoord.lng],
                popupContent: `
                    <div class="p-1.5 text-center font-bold text-xs min-w-[170px]">
                        <span class="text-[#FE7803] font-black uppercase text-[9px] tracking-wider">${isDisplayingHq ? 'Dispatch Origin' : originTitle}</span><br/>
                        <span class="text-white font-black text-xs">${originSubtitle}</span>
                        ${isDisplayingHq ? `<div class="text-[9px] text-gray-400 mt-0.5">${hqAddress.split(',')[0]}</div>` : ''}
                    </div>
                `,
                icon: originMarkerIcon
            });
        }

        return markers;
    }, [booking, currentCustomerCoord, currentMechanicCoord, customerObj, mechanicObj, driverObj, isDriverService, isRentalBooking, isDisplayingHq, isTowingService, isLiaisonService, hqName, hqAddress, db?.settings, leafletReady]);

    // Road route state for preview card
    const [cardRouteGeometry, setCardRouteGeometry] = useState<[number, number][]>([]);
    const [cardDistanceKm, setCardDistanceKm] = useState<number | null>(null);

    // Fetch road route for the inline preview card
    useEffect(() => {
        if (!currentCustomerCoord || !currentMechanicCoord) {
            setCardRouteGeometry([]);
            setCardDistanceKm(null);
            return;
        }

        let isSubscribed = true;
        const custLat = currentCustomerCoord.lat;
        const custLng = currentCustomerCoord.lng;
        const mechLat = currentMechanicCoord.lat;
        const mechLng = currentMechanicCoord.lng;

        const straightCoords: [number, number][] = [
            [mechLat, mechLng],
            [custLat, custLng]
        ];

        const latDiff = custLat - mechLat;
        const lngDiff = custLng - mechLng;
        const approxKm = Math.max(0.1, parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1)));

        const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${mechLng},${mechLat};${custLng},${custLat}?overview=full&geometries=geojson`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        fetch(osrmUrl, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (!isSubscribed) return;
                if (data && data.routes && data.routes.length > 0) {
                    const primary = data.routes[0];
                    const pts: [number, number][] = (primary.geometry?.coordinates || []).map((c: any) => [c[1], c[0]]);
                    if (pts.length > 0) {
                        setCardRouteGeometry(pts);
                        setCardDistanceKm(parseFloat((primary.distance / 1000).toFixed(1)));
                        return;
                    }
                }
                setCardRouteGeometry(straightCoords);
                setCardDistanceKm(approxKm);
            })
            .catch(() => {
                if (!isSubscribed) return;
                setCardRouteGeometry(straightCoords);
                setCardDistanceKm(approxKm);
            });

        return () => {
            isSubscribed = false;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [currentCustomerCoord?.lat, currentCustomerCoord?.lng, currentMechanicCoord?.lat, currentMechanicCoord?.lng]);

    // Live polylines for the card preview
    const cardPolylines = useMemo(() => {
        const polylines: MapPolyline[] = [];
        if (!cardRouteGeometry || cardRouteGeometry.length < 2) return polylines;

        // Glow polyline
        polylines.push({
            id: `card-glow-${booking.id}`,
            positions: cardRouteGeometry,
            color: '#FE7803',
            weight: 6,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Core polyline
        polylines.push({
            id: `card-core-${booking.id}`,
            positions: cardRouteGeometry,
            color: '#FE7803',
            weight: 3.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
        });

        return polylines;
    }, [cardRouteGeometry, booking.id]);

    // Compute center point
    const centerPoint: [number, number] = useMemo(() => {
        if (currentCustomerCoord && currentMechanicCoord) {
            return [(currentCustomerCoord.lat + currentMechanicCoord.lat) / 2, (currentCustomerCoord.lng + currentMechanicCoord.lng) / 2];
        }
        if (currentCustomerCoord) return [currentCustomerCoord.lat, currentCustomerCoord.lng];
        if (currentMechanicCoord) return [currentMechanicCoord.lat, currentMechanicCoord.lng];
        return [14.291457, 121.001210];
    }, [currentCustomerCoord, currentMechanicCoord]);

    // Map bounds to cleanly and automatically fit both Customer, Specialist and complete route
    const mapBounds = useMemo(() => {
        if (typeof L === 'undefined') return undefined;
        const pts: [number, number][] = [];
        if (cardRouteGeometry && cardRouteGeometry.length > 0) {
            pts.push(...cardRouteGeometry);
        }
        if (currentCustomerCoord) pts.push([currentCustomerCoord.lat, currentCustomerCoord.lng]);
        if (currentMechanicCoord) pts.push([currentMechanicCoord.lat, currentMechanicCoord.lng]);

        if (pts.length >= 2) {
            return L.latLngBounds(pts);
        }
        return undefined;
    }, [currentCustomerCoord, currentMechanicCoord, cardRouteGeometry, leafletReady]);

    return (
        <div className="w-full h-full min-h-[160px] rounded-2xl bg-[#101010] relative overflow-hidden border border-white/5 group">
            {/* Top Telemetry Overlay Badge */}
            {cardDistanceKm !== null ? (
                <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white shadow-lg pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{cardDistanceKm} km</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-primary font-black uppercase text-[9px] tracking-wider">
                        {isDisplayingHq ? 'HQ Route' : 'Route Active'}
                    </span>
                </div>
            ) : null}
            <MapComponent 
                center={centerPoint} 
                zoom={14} 
                markers={mapMarkers} 
                polylines={cardPolylines}
                bounds={mapBounds}
                disableScrollZoom={true}
            />
        </div>
    );
};


const formatTimeToAmPm = (timeStr: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minute} ${ampm}`;
};

const AdminBookingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db, updateBookingStatus, cancelBooking, updateBooking, updateBookingPayment, assignMechanicToBooking, verifyBookingPayment, loading, deleteAllBookings, deleteBooking, updateLiaisonBooking, updateLiaisonBookingStatus, updateSettings, updateServiceRequestStatus, updateServiceRequest, updateRentalBooking } = useDatabase();
    const { addNotification } = useNotification();
    const mechanics = useMemo(() => db?.mechanics || [], [db?.mechanics]);
    const settings = db?.settings;
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [datePreset, setDatePreset] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [activeAdminTab, setActiveAdminTab] = useState<'Services' | 'Car Rental' | 'Driver for Hire' | 'Liaison' | 'Towing'>('Services');
    const [isServiceSettingsModalOpen, setIsServiceSettingsModalOpen] = useState<boolean>(false);
    const [kpiFilter, setKpiFilter] = useState<'all' | 'total' | 'revenue' | 'completed' | 'active' | 'today' | 'unpaid'>('all');
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [viewingMapBooking, setViewingMapBooking] = useState<Booking | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewDocName, setPreviewDocName] = useState<string | null>(null);
    const [previewImageLoading, setPreviewImageLoading] = useState<boolean>(true);

    useEffect(() => {
        if (previewImageUrl) {
            setPreviewImageLoading(true);
        }
    }, [previewImageUrl]);

    const [priceDetailsBooking, setPriceDetailsBooking] = useState<Booking | null>(null);
    const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
    const [activeOpenFilter, setActiveOpenFilter] = useState<'range' | 'mechanic' | 'status' | 'payment' | null>(null);
    const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-filter-dropdown]')) {
                setActiveOpenFilter(null);
            }
            if (!target.closest('[data-search-widget]')) {
                setIsSearchFocused(false);
            }
            setOpenStatusDropdownId(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [editingDriverFields, setEditingDriverFields] = useState<{[key: string]: {driverName: string; driverPhone: string; estimatedArrivalTime: string; remarks: string}}>({});

    const handleDeleteAllBookings = async () => {
        setIsDeletingAll(true);
        try {
            let collectionName = 'bookings';
            let categoryName = 'bookings';
            if (activeAdminTab === 'Liaison') {
                collectionName = 'liaisonBookings';
                categoryName = 'Liaison bookings';
            } else if (activeAdminTab === 'Car Rental') {
                collectionName = 'rentalBookings';
                categoryName = 'Car Rental bookings';
            } else if (activeAdminTab === 'Driver for Hire' || activeAdminTab === 'Towing') {
                collectionName = 'serviceRequests';
                categoryName = 'Service Request bookings';
            }
            await deleteAllBookings(collectionName);
            setShowDeleteAllConfirm(false);
            addNotification({
                type: 'system',
                title: 'Bookings Cleared',
                message: `All ${categoryName} have been successfully deleted from the database.`,
                recipientId: 'admin'
            });
        } catch (err) {
            console.error("Failed to delete bookings", err);
            addNotification({
                type: 'system',
                title: 'Delete Failed',
                message: "Failed to delete bookings. Please try again.",
                recipientId: 'admin'
            });
        } finally {
            setIsDeletingAll(false);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedBookingId(expandedBookingId === id ? null : id);
    };

    const bookings = React.useMemo(() => {
        if (!db) return [];
        
        if (activeAdminTab === 'Services') {
            return (db.bookings || []).map(b => {
                // Ensure customer details are populated if available
                const customer = db.customers?.find(c => c.id === b.customerId || c.name === b.customerName);
                return {
                    ...b,
                    customerEmail: customer?.email || b.customerEmail || 'No email',
                    customerPhone: customer?.phone || b.customerPhone || 'No phone',
                };
            });
        } else if (activeAdminTab === 'Car Rental') {
            return (db.rentalBookings || []).map(b => {
                const customer = db.customers?.find(c => c.id === b.customerId);
                const car = db.rentalCars?.find(c => c.id === b.carId);
                const rawLoc: any = b.location;
                const bLat = rawLoc?.latitude ?? rawLoc?.lat;
                const bLng = rawLoc?.longitude ?? rawLoc?.lng;
                const resolvedAddress = rawLoc?.address || b.pickupLocation || customer?.address || 'Confirmed Service Location';
                const custLocation = (typeof bLat === 'number' && typeof bLng === 'number')
                    ? { latitude: bLat, longitude: bLng, address: resolvedAddress }
                    : (customer?.lat && customer?.lng 
                        ? { latitude: customer.lat, longitude: customer.lng, address: customer.address || 'Client Address' } 
                        : null);

                return {
                    id: b.id,
                    customerId: b.customerId,
                    customerName: customer?.name || b.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || b.customerEmail || 'No email',
                    customerPhone: customer?.phone || b.customerPhone || 'No phone',
                    customerPhoto: customer?.picture || '',
                    vehicle: {
                        make: car?.make || 'Car Rental',
                        model: car?.model || '',
                        year: car?.year || '',
                        plateNumber: car?.plateNumber || ''
                    },
                    services: [{
                        id: b.carId,
                        name: `Car Rental (${car?.make || 'Car'} ${car?.model || ''})`,
                        category: 'Car Rental',
                        price: b.totalPrice
                    }],
                    date: b.startDate,
                    time: '08:00',
                    status: b.status || 'Received',
                    // Pass all payment fields so 1st/Final payment panels render correctly
                    isPaid: b.isPaid ?? false,
                    totalAmount: b.totalPrice,
                    paidAmount: b.paidAmount,
                    paymentMethod: b.paymentMethod,
                    paymentStatus: b.paymentStatus,
                    isVerified: b.isVerified,
                    gcashPaymentStatus: b.gcashPaymentStatus,
                    gcashReference: b.gcashReference,
                    gcashReceiptUrl: b.gcashReceiptUrl,
                    gcashDownpaymentReceiptUrl: b.gcashDownpaymentReceiptUrl,
                    gcashDownpaymentReference: b.gcashDownpaymentReference,
                    gcashBalanceReceiptUrl: b.gcashBalanceReceiptUrl,
                    gcashBalanceReference: b.gcashBalanceReference,
                    gcashDeclineReason: b.gcashDeclineReason,
                    additionalCosts: b.additionalCosts,
                    createdAt: b.createdAt,
                    startDate: b.startDate,
                    endDate: b.endDate,
                    vehicleDesc: `${b.startDate} to ${b.endDate}`,
                    statusHistory: b.statusHistory || [],
                    notes: b.notes,
                    isRental: true,
                    includeDriver: b.includeDriver ?? false,
                    carObj: car,
                    carImage: car?.imageUrl || (b as any).carImage || '',
                    deliveryOption: (b as any).deliveryOption || (b.includeDriver ? 'With Professional Driver' : 'Self Drive'),
                    pickupLocation: b.pickupLocation || rawLoc?.address || 'Branch Office',
                    location: custLocation,
                    rentalBooking: b,
                };
            });
        } else if (activeAdminTab === 'Driver for Hire') {
            const requests = (db.serviceRequests || []).filter(req => 
                (req.serviceName || '').toLowerCase().includes('driver') ||
                (req.serviceId === '7') ||
                (req.details?.serviceName || '').toLowerCase().includes('driver')
            );
            return requests.map(req => {
                const customer = db.customers?.find(c => c.id === req.customerId || c.name === req.customerName);
                const assignedDriver = (db.hireDrivers || []).find(d => 
                    d.id === (req.details?.selectedDriverId || (req as any).driverId) ||
                    d.name === (req.driverName || req.details?.selectedDriverName)
                );

                // Compute price accurately (no 0 / no "For Quotation")
                let computedPrice = Number(req.totalAmount) || Number(req.details?.totalAmount) || 0;
                if (!computedPrice || computedPrice === 0) {
                    const durationStr = req.details?.duration || '';
                    if (durationStr.includes('Hourly') || durationStr.includes('2 Hours')) {
                        computedPrice = 1600;
                    } else if (durationStr.includes('4 Hours')) {
                        computedPrice = 3200;
                    } else if (durationStr.includes('8 Hours') || durationStr.includes('Full Day')) {
                        computedPrice = 4500;
                    } else if (durationStr.includes('Airport') || durationStr.includes('Out of Town')) {
                        computedPrice = 5500;
                    } else if (assignedDriver?.pricePerDay) {
                        computedPrice = assignedDriver.pricePerDay;
                    } else {
                        computedPrice = 1600;
                    }
                }

                const driverName = req.driverName || req.details?.selectedDriverName || assignedDriver?.name || 'Danilo Santos';
                const driverPhone = req.driverPhone || assignedDriver?.phone || '0917-123-4567';

                // Extract coordinates for Realtime Location Map
                let startCoords = req.details?.startCoords || (req.location?.latitude ? [req.location.latitude, req.location.longitude] : (req.location?.lat ? [req.location.lat, req.location.lng] : null));
                let endCoords = req.details?.endCoords || (req.destination?.latitude ? [req.destination.latitude, req.destination.longitude] : (req.destination?.lat ? [req.destination.lat, req.destination.lng] : null));
                
                if (!startCoords && customer?.lat && customer?.lng) {
                    startCoords = [customer.lat, customer.lng];
                }
                if (!startCoords) {
                    startCoords = [14.5995, 120.9842]; // Manila default
                }

                return {
                    id: req.id,
                    customerId: req.customerId,
                    customerName: customer?.name || req.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || req.customerEmail || 'No email',
                    customerPhone: customer?.phone || req.customerPhone || 'No phone',
                    customerObj: customer,
                    vehicle: req.vehicleDetails ? {
                        make: req.vehicleDetails.brand || 'Customer Vehicle',
                        model: req.vehicleDetails.model || '',
                        year: req.vehicleDetails.year || '',
                        plateNumber: req.vehicleDetails.plateNumber || '',
                        type: req.vehicleDetails.type || 'Sedan'
                    } : {
                        make: 'Driver Provides Vehicle',
                        model: req.details?.vehicleType || 'Sedan',
                        year: '',
                        plateNumber: 'Fleet Vehicle'
                    },
                    vehicleDetails: req.vehicleDetails,
                    services: [{
                        id: req.id,
                        name: req.serviceName || 'Driver for Hire',
                        category: 'Driver for Hire',
                        price: computedPrice
                    }],
                    service: {
                        id: req.id,
                        name: req.serviceName || 'Driver for Hire',
                        category: 'Driver for Hire',
                        price: computedPrice
                    },
                    date: req.scheduledDate || req.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                    time: req.details?.time || '08:00 AM',
                    status: req.status || 'Pending Admin Review',
                    purposeOfHire: req.purposeOfHire || req.details?.purposeOfHire || 'Personal Travel / Errands',
                    // Dynamic payment breakdown matching Car Rental flow:
                    isPaid: Boolean(req.isPaid || req.paymentStatus === 'paid'),
                    paymentMethod: req.paymentMethod || 'Online (HitPay)',
                    paymentStatus: req.paymentStatus || (req.isPaid ? 'paid' : ((req.paidAmount != null && Number(req.paidAmount) > 0) || (req.downpaymentAmount != null && Number(req.downpaymentAmount) > 0) ? 'partial' : 'pending')),
                    paidAmount: (req.isPaid || req.paymentStatus === 'paid') 
                        ? computedPrice 
                        : (req.paidAmount != null ? Number(req.paidAmount) : (req.downpaymentAmount != null ? Number(req.downpaymentAmount) : Math.round(computedPrice * 0.5))),
                    downpaymentAmount: req.downpaymentAmount != null ? Number(req.downpaymentAmount) : (req.paidAmount != null ? Number(req.paidAmount) : Math.round(computedPrice * 0.5)),
                    totalAmount: computedPrice,
                    isVerified: req.isVerified ?? (Boolean(req.isPaid || req.paymentStatus === 'paid' || (req.paidAmount != null && Number(req.paidAmount) > 0))),
                    downpaymentRef: req.downpaymentRef || req.hitpayReference || (req.details as any)?.downpaymentRef,
                    downpaymentPaidAt: req.downpaymentPaidAt,
                    balancePaymentRef: req.balancePaymentRef || (req.details as any)?.balancePaymentRef,
                    balancePaidAt: req.balancePaidAt,
                    balancePaid: req.balancePaid,
                    hitpayReference: req.hitpayReference || (req.details as any)?.hitpayReference,
                    hitpayPaymentRequestId: req.hitpayPaymentRequestId || (req.details as any)?.hitpayPaymentRequestId,
                    hitpayStatus: req.hitpayStatus || (req.details as any)?.hitpayStatus,
                    gcashReceiptUrl: req.gcashReceiptUrl || req.gcashDownpaymentReceiptUrl,
                    gcashDownpaymentReceiptUrl: req.gcashDownpaymentReceiptUrl,
                    gcashDownpaymentReference: req.gcashReference,
                    gcashBalanceReceiptUrl: req.gcashBalanceReceiptUrl,
                    gcashReference: req.gcashReference,
                    gcashPaymentStatus: req.gcashPaymentStatus,
                    gcashDeclineReason: req.gcashDeclineReason,
                    additionalCosts: req.additionalCosts || [],
                    isDriverHire: true,
                    driverName: driverName,
                    driverPhone: driverPhone,
                    driverId: req.details?.selectedDriverId || assignedDriver?.id,
                    driverObj: assignedDriver,
                    driver: assignedDriver,
                    estimatedArrivalTime: req.estimatedArrivalTime || req.details?.time || '08:00 AM',
                    remarks: req.remarks || req.notes || '',
                    notes: req.notes || '',
                    details: req.details,
                    statusHistory: (req.statusHistory && req.statusHistory.length > 0)
                        ? req.statusHistory.filter((h: any) => h.status !== 'Pending Admin Review').map((h: any) => ({
                            ...h,
                            status: h.status === 'Pending' ? 'Booking Confirmed (HitPay)' : h.status
                        }))
                        : [
                            { status: 'Booking Confirmed (HitPay)', timestamp: req.createdAt || new Date().toISOString() },
                            { status: driverName ? `Driver Assigned (${driverName})` : 'Driver Assigned', timestamp: req.updatedAt || req.createdAt || new Date().toISOString() }
                        ],
                    location: {
                        lat: startCoords[0],
                        lng: startCoords[1],
                        address: req.details?.pickupLocation || 'Pickup Location'
                    },
                    destinationLocation: endCoords ? {
                        lat: endCoords[0],
                        lng: endCoords[1],
                        address: req.details?.destination || 'Destination'
                    } : null,
                    createdAt: req.createdAt
                };
            });
        } else if (activeAdminTab === 'Liaison') {
            return (db.liaisonBookings || []).map(b => {
                const customer = db.customers?.find(c => c.id === b.customerId || c.name === b.customerName);
                const rawLat = (b as any).location?.latitude ?? (b as any).location?.lat ?? (b as any).pickupLocationCoords?.lat ?? (b as any).pickupLocationCoords?.latitude ?? customer?.lat;
                const rawLng = (b as any).location?.longitude ?? (b as any).location?.lng ?? (b as any).pickupLocationCoords?.lng ?? (b as any).pickupLocationCoords?.longitude ?? customer?.lng;
                const custLat = rawLat != null && !isNaN(Number(rawLat)) && Number(rawLat) !== 0 ? Number(rawLat) : 14.291457;
                const custLng = rawLng != null && !isNaN(Number(rawLng)) && Number(rawLng) !== 0 ? Number(rawLng) : 121.001210;
                const addressStr = (b as any).pickupAddress || (b as any).location?.address || customer?.address || b.branchName || 'LTO Branch Service Area';
                
                // Realtime computed pricing (no 0 / no "For Quotation")
                const totalAmt = Number(b.totalAmount) || Number(b.fees?.total) || (b.serviceType?.toLowerCase().includes('registration') ? 1500 : 2500);
                const isFullyPaid = Boolean(b.isPaid || b.paymentStatus === 'Paid' || b.paymentStatus === 'paid');
                const initialDeposit = (b as any).downpaymentAmount != null && Number((b as any).downpaymentAmount) > 0
                    ? Number((b as any).downpaymentAmount)
                    : (Number(b.paidAmount) || (b.fees?.serviceFee ? Math.round(b.fees.serviceFee * 0.5) : Math.round(totalAmt * 0.5)));
                const currentPaidAmount = isFullyPaid ? totalAmt : initialDeposit;

                return {
                    id: b.id,
                    customerId: b.customerId,
                    customerName: customer?.name || b.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || b.customerEmail || 'No email',
                    customerPhone: customer?.phone || b.customerPhone || 'No phone',
                    customerObj: customer,
                    vehicle: {
                        make: b.vehicleDetails?.brand || '',
                        model: b.vehicleDetails?.model || '',
                        year: b.vehicleDetails?.year || '',
                        plateNumber: b.vehicleDetails?.plateNumber || ''
                    },
                    vehicleDetails: b.vehicleDetails,
                    serviceType: b.serviceType,
                    services: [{
                        id: b.id,
                        name: `LTO Liaison (${b.serviceType || 'Registration Assistance'})`,
                        category: 'Liason Services',
                        price: totalAmt
                    }],
                    service: {
                        id: b.id,
                        name: `LTO Liaison (${b.serviceType || 'Registration Assistance'})`,
                        category: 'Liason Services',
                        price: totalAmt
                    },
                    date: b.appointmentDate,
                    time: b.appointmentTime,
                    status: b.status || 'Booking Received',
                    // Live dynamic payment metrics matching other services:
                    isPaid: isFullyPaid,
                    paymentStatus: b.paymentStatus || (isFullyPaid ? 'paid' : 'partial'),
                    paymentMethod: b.paymentMethod || 'Online (HitPay)',
                    totalAmount: totalAmt,
                    paidAmount: currentPaidAmount,
                    downpaymentAmount: initialDeposit,
                    isVerified: (b as any).isVerified ?? Boolean(isFullyPaid || (b as any).hitpayReference || (b as any).downpaymentRef || b.paidAmount || (b.fees && b.fees.total > 0)),
                    downpaymentRef: (b as any).downpaymentRef || (b as any).hitpayReference,
                    downpaymentPaidAt: (b as any).downpaymentPaidAt,
                    balancePaymentRef: (b as any).balancePaymentRef,
                    balancePaidAt: (b as any).balancePaidAt,
                    balancePaid: (b as any).balancePaid,
                    hitpayReference: (b as any).hitpayReference,
                    hitpayPaymentRequestId: (b as any).hitpayPaymentRequestId,
                    hitpayStatus: (b as any).hitpayStatus,
                    gcashReceiptUrl: (b as any).gcashReceiptUrl,
                    gcashDownpaymentReceiptUrl: (b as any).gcashDownpaymentReceiptUrl,
                    gcashBalanceReceiptUrl: (b as any).gcashBalanceReceiptUrl,
                    gcashReference: (b as any).gcashReference,
                    fees: b.fees,
                    createdAt: b.createdAt || b.appointmentDate,
                    agentName: b.liaisonName || 'Unassigned',
                    branchName: b.branchName || '',
                    documents: b.documents || [],
                    pickupOption: b.pickupOption,
                    pickupAddress: addressStr,
                    pickupLocation: addressStr,
                    pickupLocationCoords: {
                        lat: custLat,
                        lng: custLng
                    },
                    location: {
                        lat: custLat,
                        lng: custLng,
                        latitude: custLat,
                        longitude: custLng,
                        address: addressStr
                    }
                };
            });
        } else if (activeAdminTab === 'Towing') {
            const requests = (db.serviceRequests || []).filter(req => 
                (req.serviceName || '').toLowerCase().includes('towing')
            );
            return requests.map(req => {
                const customer = db.customers?.find(c => c.id === req.customerId || c.name === req.customerName);
                const startCoords = req.details?.startCoords || (req.location?.latitude ? [req.location.latitude, req.location.longitude] : (req.location?.lat ? [req.location.lat, req.location.lng] : null));
                const custLat = startCoords ? Number(startCoords[0]) : (customer?.lat != null ? Number(customer.lat) : 14.291457);
                const custLng = startCoords ? Number(startCoords[1]) : (customer?.lng != null ? Number(customer.lng) : 121.001210);
                const addressStr = req.details?.pickupLocation || (req.location as any)?.address || customer?.address || 'Roadside Assistance Pickup';
                
                // Realtime computed pricing (no 0 / no "For Quotation")
                const totalAmt = Number(req.totalAmount) || Number((req as any).price) || Number(req.details?.totalAmount) || 3500;
                const isFullyPaid = Boolean(req.isPaid || req.paymentStatus === 'paid' || req.paymentStatus === 'Paid');
                const initialDeposit = req.downpaymentAmount != null && Number(req.downpaymentAmount) > 0
                    ? Number(req.downpaymentAmount)
                    : (Number(req.paidAmount) || Number(req.details?.downpaymentAmount) || Math.round(totalAmt * 0.5));
                const currentPaidAmount = isFullyPaid ? totalAmt : initialDeposit;

                return {
                    id: req.id,
                    customerId: req.customerId,
                    customerName: customer?.name || req.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || req.customerEmail || 'No email',
                    customerPhone: customer?.phone || req.customerPhone || 'No phone',
                    customerObj: customer,
                    vehicle: req.vehicleDetails ? {
                        make: req.vehicleDetails.brand || 'Towed Vehicle',
                        model: req.vehicleDetails.model || '',
                        year: req.vehicleDetails.year || '',
                        plateNumber: req.vehicleDetails.plateNumber || ''
                    } : {
                        make: 'Towing request',
                        model: '',
                        year: '',
                        plateNumber: ''
                    },
                    vehicleDetails: req.vehicleDetails,
                    services: [{
                        id: req.id,
                        name: req.serviceName || 'Towing / Roadside Assistance',
                        category: 'Towing',
                        price: totalAmt
                    }],
                    service: {
                        id: req.id,
                        name: req.serviceName || 'Towing / Roadside Assistance',
                        category: 'Towing',
                        price: totalAmt
                    },
                    date: req.scheduledDate || req.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                    time: req.details?.time || '08:00',
                    status: req.status || 'Pending',
                    // Live dynamic payment metrics matching other services:
                    isPaid: isFullyPaid,
                    paymentStatus: req.paymentStatus || (isFullyPaid ? 'paid' : 'partial'),
                    paymentMethod: req.paymentMethod || (req.details as any)?.paymentMethod || 'Online (HitPay)',
                    totalAmount: totalAmt,
                    paidAmount: currentPaidAmount,
                    downpaymentAmount: initialDeposit,
                    isVerified: req.isVerified ?? Boolean(isFullyPaid || req.hitpayReference || req.downpaymentRef || (req.details as any)?.hitpayReference || (req.details as any)?.downpaymentRef || currentPaidAmount > 0),
                    downpaymentRef: req.downpaymentRef || req.hitpayReference || (req.details as any)?.downpaymentRef || (req.details as any)?.hitpayReference,
                    downpaymentPaidAt: req.downpaymentPaidAt,
                    balancePaymentRef: req.balancePaymentRef || (req.details as any)?.balancePaymentRef,
                    balancePaidAt: req.balancePaidAt,
                    balancePaid: req.balancePaid,
                    hitpayReference: req.hitpayReference || (req.details as any)?.hitpayReference,
                    hitpayPaymentRequestId: req.hitpayPaymentRequestId || (req.details as any)?.hitpayPaymentRequestId,
                    hitpayStatus: req.hitpayStatus || (req.details as any)?.hitpayStatus,
                    gcashReceiptUrl: req.gcashReceiptUrl || req.gcashDownpaymentReceiptUrl,
                    gcashDownpaymentReceiptUrl: req.gcashDownpaymentReceiptUrl,
                    gcashBalanceReceiptUrl: req.gcashBalanceReceiptUrl,
                    gcashReference: req.gcashReference,
                    createdAt: req.createdAt,
                    notes: req.notes,
                    details: req.details,
                    pickupLocation: addressStr,
                    destination: req.details?.destination ? {
                        latitude: req.details?.destinationCoords?.[0] || 14.5995,
                        longitude: req.details?.destinationCoords?.[1] || 120.9842,
                        address: req.details.destination
                    } : null,
                    location: {
                        lat: custLat,
                        lng: custLng,
                        latitude: custLat,
                        longitude: custLng,
                        address: addressStr
                    }
                };
            });
        }
        return [];
    }, [db, activeAdminTab]);

    const bookingSequences = useMemo(() => {
        if (!bookings) return {};
        const sortedBookings = [...bookings].sort((a, b) => {
            const timeA = parseDateTime(a.date, a.time);
            const timeB = parseDateTime(b.date, b.time);
            if (timeA !== timeB) return timeA - timeB;
            return a.id.localeCompare(b.id);
        });

        const mapping: Record<string, string> = {};
        const yearCounters: Record<string, number> = {};

        sortedBookings.forEach(booking => {
            const getYear = (bk: typeof booking) => {
                if (bk.date) {
                    const match = bk.date.match(/\b\d{4}\b/);
                    if (match) return match[0];
                    const d = new Date(bk.date.replace(/-/g, '/'));
                    if (!isNaN(d.getTime())) return String(d.getFullYear());
                }
                return '2026';
            };
            const year = getYear(booking);
            yearCounters[year] = (yearCounters[year] || 0) + 1;
            mapping[booking.id] = `RB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
        });
        return mapping;
    }, [bookings]);

    const viewingCustomer = useMemo(() => {
        if (!viewingBooking || !db) return undefined;
        return db.customers.find(c => c.name === viewingBooking.customerName);
    }, [viewingBooking, db]);

    const serviceCategories = useMemo(() => {
        if (!db?.services) return ['all'];
        const uniqueCategories = Array.from(new Set(db.services.map(s => s.category).filter(Boolean)));
        return ['all', ...uniqueCategories];
    }, [db]);
    const bookingStatuses = useMemo(() => {
        switch (activeAdminTab) {
            case 'Services':
                return ['all', 'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled', 'Reschedule Requested'];
            case 'Car Rental':
                return ['all', 'Received', 'Pending', 'Approved', 'Completed', 'Cancelled'];
            case 'Driver for Hire':
                return ['all', 'Pending', 'Assigned', 'Completed', 'Cancelled'];
            case 'Liaison':
                return ['all', 'Booking Received', 'LTO Processing', 'Completed', 'Cancelled'];
            case 'Towing':
                return ['all', 'Pending', 'Dispatched', 'Completed', 'Cancelled'];
            default:
                return ['all'];
        }
    }, [activeAdminTab]);

    // Date preset handler
    const handleDatePreset = (preset: string) => {
        setDatePreset(preset);
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        switch (preset) {
            case 'today':
                setDateFilter({
                    start: startOfDay.toISOString().split('T')[0],
                    end: startOfDay.toISOString().split('T')[0]
                });
                break;
            case 'week':
                const weekStart = new Date(startOfDay);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                setDateFilter({
                    start: weekStart.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                });
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFilter({
                    start: monthStart.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                });
                break;
            case 'all':
                setDateFilter({ start: '', end: '' });
                break;
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Booking ID', 'Customer', 'Service', 'Vehicle', 'Mechanic', 'Date', 'Time', 'Price', 'Status', 'Payment Status'];
        const rows = sortedAndFilteredBookings.map(b => {
            const svcs = b.services && b.services.length > 0 ? b.services : b.service ? [b.service] : [];
            const totalPrice = b.totalAmount ?? svcs.reduce((sum, s) => sum + s.price, 0);
            return [
                b.id,
                b.customerName,
                svcs.map(s => s.name).join('; ') || 'N/A',
                `${b.vehicle?.year || ''} ${b.vehicle?.make || ''} ${b.vehicle?.model || 'N/A'}`,
                b.mechanic?.name || 'Not Assigned',
                b.date,
                b.time,
                totalPrice,
                b.status,
                b.isPaid ? 'Paid' : 'Unpaid'
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        addNotification({ type: 'success', title: 'Export Successful', message: 'Bookings exported to CSV', recipientId: 'admin' });
    };

    const handleStatusChange = async (booking: any, newStatus: any) => {
        if (newStatus === 'Cancelled') {
            setCancellingBooking(booking);
        } else {
            try {
                if (activeAdminTab === 'Services') {
                    await updateBookingStatus(booking.id, newStatus);
                } else if (activeAdminTab === 'Liaison') {
                    await updateLiaisonBookingStatus(booking.id, newStatus);
                } else if (activeAdminTab === 'Car Rental') {
                    await updateRentalBooking(booking.id, { status: newStatus });
                } else {
                    await updateServiceRequestStatus(booking.id, newStatus);
                }
                addNotification({ type: 'success', title: 'Status Updated', message: `Booking #${booking.id.slice(-6)} is now ${newStatus}.`, recipientId: 'admin' });
            } catch (e) {
                addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
            }
        }
    };

    const handleConfirmCancellation = async (reason: string) => {
        if (cancellingBooking) {
            try {
                if (activeAdminTab === 'Services') {
                    await cancelBooking(cancellingBooking.id, reason);
                } else if (activeAdminTab === 'Liaison') {
                    await updateLiaisonBookingStatus(cancellingBooking.id, 'Cancelled', reason);
                } else if (activeAdminTab === 'Car Rental') {
                    await updateRentalBooking(cancellingBooking.id, { status: 'Cancelled', cancelReason: reason });
                } else {
                    await updateDoc(doc(firestoreDB, 'serviceRequests', cancellingBooking.id), { status: 'Cancelled', cancelReason: reason });
                }
                addNotification({ type: 'success', title: 'Booking Cancelled', message: `Booking #${cancellingBooking.id.slice(-6)} has been cancelled.`, recipientId: 'admin' });
                setCancellingBooking(null);
            } catch (e) {
                addNotification({ type: 'error', title: 'Cancellation Failed', message: (e as Error).message, recipientId: 'admin' });
            }
        }
    };

    const handleMarkPaid = async (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
        const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
        const addCosts = (booking.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
        const bookingTotal = originalServicesFee + addCosts;
        const remaining = Math.max(0, bookingTotal - (booking.paidAmount || 0));

        try {
            if (activeAdminTab === 'Driver for Hire' || activeAdminTab === 'Towing' || (booking as any).isDriverHire) {
                await updateServiceRequest(bookingId, {
                    paidAmount: bookingTotal,
                    isPaid: true,
                    paymentStatus: 'paid',
                    balancePaid: true,
                    balancePaidAt: new Date().toISOString()
                });
            } else if (activeAdminTab === 'Car Rental' || (booking as any).isRental) {
                await updateRentalBooking(bookingId, {
                    paidAmount: bookingTotal,
                    isPaid: true,
                    paymentStatus: 'paid' as any
                });
            } else if (activeAdminTab === 'Liaison') {
                await updateLiaisonBooking(bookingId, {
                    paidAmount: bookingTotal,
                    isPaid: true,
                    paymentStatus: 'Paid',
                    balancePaid: true,
                    balancePaidAt: new Date().toISOString()
                } as any);
            } else {
                await updateBookingPayment(bookingId, remaining, 'paid');
            }
            addNotification({ type: 'success', title: 'Payment Updated', message: `Booking #${bookingId.slice(-6)} marked as paid.`, recipientId: 'admin' });
        } catch (e) {
            addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const handleAssignMechanic = async (bookingId: string, mechanic: Mechanic) => {
        try {
            await assignMechanicToBooking(bookingId, mechanic);
            addNotification({ type: 'success', title: 'Mechanic Assigned', message: `${mechanic.name} assigned to booking #${bookingId.slice(-6)}.`, recipientId: 'admin' });
            setAssigningBooking(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Assignment Failed', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const handleViewMap = (booking: Booking) => {
        setViewingMapBooking(booking);
    };

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredBookings = useMemo(() => {
        let filteredBookings = bookings.filter(booking => {
            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
            
            // Tab routing matching logic
            const firstSvcName = svcs[0]?.name || '';
            const firstSvcCat = svcs[0]?.category || '';
            
            let tabMatch = false;
            if (activeAdminTab === 'Services') {
                // Default Mechanic / Maintenance / Repair / Emergency Services (not Car Rental, Driver for Hire, Liaison, Towing)
                const isCarRental = firstSvcCat === 'Car Rental' || firstSvcName.toLowerCase().includes('rental') || firstSvcName.toLowerCase().includes('car rent');
                const isDriver = firstSvcCat === 'Driver for Hire' || firstSvcName.toLowerCase().includes('driver for hire') || firstSvcName.toLowerCase().includes('hire driver');
                const isLiaison = firstSvcCat === 'Liason Services' || firstSvcCat === 'Liaison' || firstSvcName.toLowerCase().includes('liaison') || firstSvcName.toLowerCase().includes('lto') || firstSvcName.toLowerCase().includes('registration');
                const isTowing = firstSvcName.toLowerCase().includes('towing') || firstSvcName.toLowerCase().includes('roadside') || firstSvcName.toLowerCase().includes('wrecker');
                tabMatch = !isCarRental && !isDriver && !isLiaison && !isTowing;
            } else if (activeAdminTab === 'Car Rental') {
                tabMatch = firstSvcCat === 'Car Rental' || firstSvcName.toLowerCase().includes('rental') || firstSvcName.toLowerCase().includes('car rent');
            } else if (activeAdminTab === 'Driver for Hire') {
                tabMatch = firstSvcCat === 'Driver for Hire' || firstSvcName.toLowerCase().includes('driver for hire') || firstSvcName.toLowerCase().includes('hire driver');
            } else if (activeAdminTab === 'Liaison') {
                tabMatch = firstSvcCat === 'Liason Services' || firstSvcCat === 'Liaison' || firstSvcName.toLowerCase().includes('liaison') || firstSvcName.toLowerCase().includes('lto') || firstSvcName.toLowerCase().includes('registration');
            } else if (activeAdminTab === 'Towing') {
                tabMatch = firstSvcName.toLowerCase().includes('towing') || firstSvcName.toLowerCase().includes('roadside') || firstSvcName.toLowerCase().includes('wrecker');
            }

            if (!tabMatch) return false;

            const mechanicMatch = selectedMechanicId === 'all' || booking.mechanic?.id === selectedMechanicId;
            const categoryMatch = selectedCategory === 'all' || svcs.some(s => s.category === selectedCategory);
            const statusMatch = selectedStatus === 'all' || booking.status === selectedStatus;
            const paymentMatch = paymentFilter === 'all' || (paymentFilter === 'paid' ? booking.isPaid : !booking.isPaid);
            const searchLower = searchQuery.toLowerCase().trim();
            const searchMatch = searchLower === '' || 
                (booking.customerName || '').toLowerCase().includes(searchLower) ||
                (booking.customerPhone || '').toLowerCase().includes(searchLower) ||
                (booking.customerEmail || '').toLowerCase().includes(searchLower) ||
                (booking.id || '').toLowerCase().includes(searchLower) ||
                (booking.mechanic?.name || '').toLowerCase().includes(searchLower) ||
                (booking.driverName || '').toLowerCase().includes(searchLower) ||
                (booking.agentName || '').toLowerCase().includes(searchLower) ||
                svcs.some(s => (s.name || '').toLowerCase().includes(searchLower) || (s.category || '').toLowerCase().includes(searchLower)) ||
                (booking.vehicle?.make || '').toLowerCase().includes(searchLower) ||
                (booking.vehicle?.model || '').toLowerCase().includes(searchLower) ||
                (booking.vehicle?.plateNumber || '').toLowerCase().includes(searchLower);
            let dateMatch = true;
            if (dateFilter.start && dateFilter.end) {
                const startDate = new Date(dateFilter.start.replace(/-/g, '/')).getTime();
                const endDateObj = new Date(dateFilter.end.replace(/-/g, '/'));
                endDateObj.setDate(endDateObj.getDate() + 1);
                const endDate = endDateObj.getTime();
                const bookingDate = new Date(booking.date.replace(/-/g, '/')).getTime();
                dateMatch = bookingDate >= startDate && bookingDate < endDate;
            }

            // Interactive KPI filter matching
            let kpiMatch = true;
            if (kpiFilter === 'revenue') {
                kpiMatch = Boolean(booking.isPaid);
            } else if (kpiFilter === 'unpaid') {
                kpiMatch = !booking.isPaid;
            } else if (kpiFilter === 'completed') {
                kpiMatch = booking.status === 'Completed';
            } else if (kpiFilter === 'active') {
                const upcomingList = activeAdminTab === 'Services' 
                    ? ['Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Reschedule Requested']
                    : activeAdminTab === 'Car Rental' 
                    ? ['Received', 'Pending', 'Approved', 'Active']
                    : activeAdminTab === 'Driver for Hire'
                    ? ['Pending', 'Assigned']
                    : activeAdminTab === 'Liaison'
                    ? ['Booking Received', 'LTO Processing']
                    : ['Pending', 'Dispatched'];
                kpiMatch = upcomingList.includes(booking.status || '');
            } else if (kpiFilter === 'today') {
                kpiMatch = booking.date === new Date().toISOString().split('T')[0];
            }

            return mechanicMatch && categoryMatch && statusMatch && searchMatch && dateMatch && paymentMatch && kpiMatch;
        });

        if (sortConfig.key) {
            filteredBookings.sort((a, b) => {
                let aValue: string | number; let bValue: string | number;
                const getTotal = (bk: typeof a) => {
                    if (bk.totalAmount != null) return bk.totalAmount;
                    const s = bk.services && bk.services.length > 0 ? bk.services : bk.service ? [bk.service] : [];
                    return s.reduce((sum, svc) => sum + svc.price, 0);
                };
                if (sortConfig.key === 'id') {
                    aValue = bookingSequences[a.id] || '';
                    bValue = bookingSequences[b.id] || '';
                }
                else if (sortConfig.key === 'mechanicName') { aValue = a.mechanic?.name || ''; bValue = b.mechanic?.name || ''; }
                else if (sortConfig.key === 'date') {
                    aValue = parseDateTime(a.date, a.time);
                    bValue = parseDateTime(b.date, b.time);
                }
                else if (sortConfig.key === 'price') { 
                    aValue = getTotal(a);
                    bValue = getTotal(b);
                }
                else { aValue = a[sortConfig.key as 'customerName'] as string; bValue = b[sortConfig.key as 'customerName'] as string; }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredBookings;
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig, dateFilter, paymentFilter, bookingSequences, activeAdminTab, kpiFilter]);

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600 ml-1" />;
        return sortConfig.direction === 'ascending' ? <ChevronDown size={14} className="text-primary rotate-180 ml-1" /> : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-900/50 text-blue-300 border border-blue-500/30',
        'Booking Confirmed': 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30',
        'Mechanic Assigned': 'bg-sky-900/50 text-sky-300 border border-sky-500/30',
        'En Route': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30',
        'In Progress': 'bg-rose-900/50 text-rose-300 border border-rose-500/30',
        'Work Done': 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30',
        Completed: 'bg-green-900/50 text-green-300 border border-green-500/30',
        Cancelled: 'bg-red-900/50 text-red-300 border border-red-500/30',
        'Reschedule Requested': 'bg-orange-900/50 text-orange-300 border border-orange-500/30',
        'On Hold': 'bg-amber-900/50 text-amber-300 border border-amber-500/30',
    };

    // Enhanced KPI calculations with trends
    const bookingStats = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Filter bookings by the active tab domain first
        const tabBookings = bookings.filter(booking => {
            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
            const firstSvcName = svcs[0]?.name || '';
            const firstSvcCat = svcs[0]?.category || '';
            
            if (activeAdminTab === 'Services') {
                const isCarRental = firstSvcCat === 'Car Rental' || firstSvcName.toLowerCase().includes('rental') || firstSvcName.toLowerCase().includes('car rent');
                const isDriver = firstSvcCat === 'Driver for Hire' || firstSvcName.toLowerCase().includes('driver for hire') || firstSvcName.toLowerCase().includes('hire driver');
                const isLiaison = firstSvcCat === 'Liason Services' || firstSvcCat === 'Liaison' || firstSvcName.toLowerCase().includes('liaison') || firstSvcName.toLowerCase().includes('lto') || firstSvcName.toLowerCase().includes('registration');
                const isTowing = firstSvcName.toLowerCase().includes('towing') || firstSvcName.toLowerCase().includes('roadside') || firstSvcName.toLowerCase().includes('wrecker');
                return !isCarRental && !isDriver && !isLiaison && !isTowing;
            } else if (activeAdminTab === 'Car Rental') {
                return firstSvcCat === 'Car Rental' || firstSvcName.toLowerCase().includes('rental') || firstSvcName.toLowerCase().includes('car rent');
            } else if (activeAdminTab === 'Driver for Hire') {
                return firstSvcCat === 'Driver for Hire' || firstSvcName.toLowerCase().includes('driver for hire') || firstSvcName.toLowerCase().includes('hire driver');
            } else if (activeAdminTab === 'Liaison') {
                return firstSvcCat === 'Liason Services' || firstSvcCat === 'Liaison' || firstSvcName.toLowerCase().includes('liaison') || firstSvcName.toLowerCase().includes('lto') || firstSvcName.toLowerCase().includes('registration');
            } else if (activeAdminTab === 'Towing') {
                return firstSvcName.toLowerCase().includes('towing') || firstSvcName.toLowerCase().includes('roadside') || firstSvcName.toLowerCase().includes('wrecker');
            }
            return true;
        });

        const last30Days = tabBookings.filter(b => new Date(b.date) >= thirtyDaysAgo);
        const previous30Days = tabBookings.filter(b => {
            const date = new Date(b.date);
            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
        });

        const getBookingTotal = (b: (typeof bookings)[0]) => {
            const svcs = b.services && b.services.length > 0 ? b.services : b.service ? [b.service] : [];
            const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(b.totalAmount) || 0);
            const addCosts = (b.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.price) || 0), 0);
            return originalServicesFee + addCosts;
        };

        const totalRevenue = tabBookings.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0);
        const pendingRevenue = tabBookings.filter(b => !b.isPaid && b.status !== 'Cancelled').reduce((sum, b) => sum + getBookingTotal(b), 0);
        const avgBookingValue = tabBookings.length > 0 ? (totalRevenue / (tabBookings.filter(b => b.status === 'Completed' && b.isPaid).length || 1)) : 0;

        const todayBookings = tabBookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length;

        const trendCalc = (current: number, previous: number) => {
            if (previous === 0) return { value: 0, isPositive: current > 0 };
            const change = ((current - previous) / previous) * 100;
            return { value: Math.round(Math.abs(change)), isPositive: change >= 0 };
        };

        const getUpcomingStatuses = () => {
            switch (activeAdminTab) {
                case 'Services':
                    return ['Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Reschedule Requested'];
                case 'Car Rental':
                    return ['Received', 'Pending', 'Approved', 'Active'];
                case 'Driver for Hire':
                    return ['Pending', 'Assigned'];
                case 'Liaison':
                    return ['Booking Received', 'LTO Processing'];
                case 'Towing':
                    return ['Pending', 'Dispatched'];
                default:
                    return [];
            }
        };
        const upcomingStatuses = getUpcomingStatuses();

        const completedCount = tabBookings.filter(b => b.status === 'Completed').length;
        const completionRate = tabBookings.length > 0 ? Math.round((completedCount / tabBookings.length) * 100) : 0;
        const activeCount = tabBookings.filter(b => upcomingStatuses.includes(b.status || '')).length;
        const paidBookingsCount = tabBookings.filter(b => b.isPaid).length;
        const unpaidBookingsCount = tabBookings.filter(b => !b.isPaid && b.status !== 'Cancelled').length;

        return {
            total: tabBookings.length,
            totalTrend: trendCalc(last30Days.length, previous30Days.length),
            upcoming: activeCount,
            completed: completedCount,
            completionRate,
            completedTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed').length,
                previous30Days.filter(b => b.status === 'Completed').length
            ),
            cancelled: tabBookings.filter(b => b.status === 'Cancelled').length,
            totalRevenue,
            paidBookingsCount,
            unpaidBookingsCount,
            revenueTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0),
                previous30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0)
            ),
            pendingRevenue,
            avgBookingValue,
            todayBookings,
            activeTab: activeAdminTab
        };
    }, [bookings, activeAdminTab]);

    // Live search suggestions across Customer, Mechanic, Service, and Vehicle
    const searchSuggestions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];

        const suggestions: Array<{
            id: string;
            category: 'Customer' | 'Mechanic' | 'Service' | 'Vehicle';
            title: string;
            subtitle: string;
            badgeText?: string;
        }> = [];

        const addedKeys = new Set<string>();

        for (const booking of bookings) {
            if (suggestions.length >= 8) break;

            // 1. Customer Match
            const custName = booking.customerName || '';
            const custPhone = booking.customerPhone || '';
            if (custName.toLowerCase().includes(query) || custPhone.toLowerCase().includes(query)) {
                const key = `customer-${custName.toLowerCase()}`;
                if (!addedKeys.has(key)) {
                    addedKeys.add(key);
                    suggestions.push({
                        id: key,
                        category: 'Customer',
                        title: custName,
                        subtitle: custPhone ? `Phone: ${custPhone}` : `Booking #${booking.id?.slice(-6) || ''}`,
                        badgeText: 'Customer'
                    });
                }
            }

            // 2. Service Match
            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
            for (const s of svcs) {
                if (suggestions.length >= 8) break;
                const sName = s.name || '';
                const sCat = s.category || '';
                if (sName.toLowerCase().includes(query) || sCat.toLowerCase().includes(query)) {
                    const key = `service-${sName.toLowerCase()}`;
                    if (!addedKeys.has(key)) {
                        addedKeys.add(key);
                        suggestions.push({
                            id: key,
                            category: 'Service',
                            title: sName,
                            subtitle: sCat ? `Category: ${sCat}` : 'Service',
                            badgeText: 'Service'
                        });
                    }
                }
            }

            // 3. Mechanic or Driver Match
            const mechName = booking.mechanic?.name || booking.driverName || booking.agentName || '';
            if (mechName && mechName.toLowerCase().includes(query)) {
                const key = `mech-${mechName.toLowerCase()}`;
                if (!addedKeys.has(key)) {
                    addedKeys.add(key);
                    suggestions.push({
                        id: key,
                        category: 'Mechanic',
                        title: mechName,
                        subtitle: activeAdminTab === 'Driver for Hire' ? 'Assigned Driver' : activeAdminTab === 'Liaison' ? 'Assigned Liaison' : 'Assigned Mechanic',
                        badgeText: activeAdminTab === 'Driver for Hire' ? 'Driver' : 'Mechanic'
                    });
                }
            }

            // 4. Vehicle Match
            const vMake = booking.vehicle?.make || '';
            const vModel = booking.vehicle?.model || '';
            const vPlate = booking.vehicle?.plateNumber || '';
            const vCombined = `${vMake} ${vModel}`.trim();
            if (
                (vCombined && vCombined.toLowerCase().includes(query)) ||
                (vPlate && vPlate.toLowerCase().includes(query))
            ) {
                const key = `vehicle-${(vPlate || vCombined).toLowerCase()}`;
                if (!addedKeys.has(key)) {
                    addedKeys.add(key);
                    suggestions.push({
                        id: key,
                        category: 'Vehicle',
                        title: vCombined || 'Vehicle',
                        subtitle: vPlate ? `Plate: ${vPlate}` : (booking.vehicle?.year ? `Year: ${booking.vehicle.year}` : 'Vehicle Details'),
                        badgeText: 'Vehicle'
                    });
                }
            }
        }

        return suggestions;
    }, [bookings, searchQuery, activeAdminTab]);

    const activeFiltersCount = [
        selectedMechanicId !== 'all',
        selectedCategory !== 'all',
        selectedStatus !== 'all',
        paymentFilter !== 'all',
        datePreset !== 'all' || dateFilter.start !== '' || dateFilter.end !== ''
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setSelectedMechanicId('all');
        setSelectedCategory('all');
        setSelectedStatus('all');
        setPaymentFilter('all');
        setDateFilter({ start: '', end: '' });
        setDatePreset('all');
        setSearchQuery('');
        setKpiFilter('all');
    };

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    return (
        <div className="text-admin-text-primary flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 relative z-30">
                {/* Header Title, Tabs, & Actions Inline Layout */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 pb-5 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter leading-none">Manage Bookings</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="h-1 w-6 bg-primary rounded-full"></div>
                                <p className="text-gray-500 font-bold tracking-[0.3em] text-[8px] uppercase">Operations & Scheduling</p>
                            </div>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden sm:block w-px h-8 bg-white/10" />

                        {/* Inline Service Tab Switchers */}
                        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full sm:max-w-max">
                            {(['Services', 'Car Rental', 'Driver for Hire', 'Liaison', 'Towing'] as const).map(tab => {
                                const isActive = activeAdminTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveAdminTab(tab);
                                            setExpandedBookingId(null);
                                            setSelectedStatus('all');
                                            setSelectedMechanicId('all');
                                            setSearchQuery('');
                                            setKpiFilter('all');
                                        }}
                                        className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-200 active:scale-95 cursor-pointer ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Action Buttons Inline */}
                        <Tooltip content="Delete all bookings from database">
                            <button
                                onClick={() => setShowDeleteAllConfirm(true)}
                                className="h-9 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold tracking-widest text-xs border border-red-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <Trash2 size={14} />
                                Delete All
                            </button>
                        </Tooltip>
                        
                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10" />

                        <Tooltip content="Export bookings to CSV file">
                            <button
                                onClick={exportToCSV}
                                className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold tracking-widest text-xs border border-white/10 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <Download size={14} />
                                Export CSV
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Enhanced Interactive Domain-Tailored KPI Cards */}
                <div className="space-y-2 mb-4">
                    {/* Active Filter Quick Reset Banner */}
                    {kpiFilter !== 'all' && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-bold text-primary animate-fadeIn">
                            <div className="flex items-center gap-2">
                                <Filter size={13} className="animate-pulse" />
                                <span>
                                    Filtered by KPI: <span className="uppercase font-black text-white ml-1 underline decoration-primary">{kpiFilter}</span>
                                </span>
                            </div>
                            <button
                                onClick={() => setKpiFilter('all')}
                                className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-black hover:bg-orange-400 transition cursor-pointer"
                            >
                                <X size={12} /> Clear Filter
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {(() => {
                            // 1. SERVICES TAB (Mechanics, Maintenance, Auto Repairs)
                            if (activeAdminTab === 'Services') {
                                return (
                                    <>
                                        <EnhancedKPICard
                                            title="Total Jobs"
                                            value={bookingStats.total}
                                            icon={<Wrench className="w-5 h-5 text-blue-400" />}
                                            gradient="bg-gradient-to-br from-blue-600/30 to-blue-900/40"
                                            glowBorder="ring-blue-500 border-blue-500 shadow-blue-500/25"
                                            trend={bookingStats.totalTrend}
                                            subtitle={`${bookingStats.total} job${bookingStats.total === 1 ? '' : 's'} recorded`}
                                            badge="Repair Jobs"
                                            detail="All vehicle repair and maintenance jobs booked by customers."
                                            isActive={kpiFilter === 'total'}
                                            onClick={() => setKpiFilter(prev => prev === 'total' ? 'all' : 'total')}
                                        />
                                        <EnhancedKPICard
                                            title="Money Collected"
                                            value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                                            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.revenueTrend}
                                            subtitle={bookingStats.pendingRevenue > 0 ? `₱${bookingStats.pendingRevenue.toLocaleString()} pending collect` : 'All accounts settled'}
                                            badge="Revenue"
                                            detail="Total money successfully paid and collected from finished services."
                                            isActive={kpiFilter === 'revenue'}
                                            onClick={() => setKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue')}
                                        />
                                        <EnhancedKPICard
                                            title="Jobs Done"
                                            value={bookingStats.completed}
                                            icon={<CheckCircle className="w-5 h-5 text-teal-400" />}
                                            gradient="bg-gradient-to-br from-teal-600/30 to-teal-900/40"
                                            glowBorder="ring-teal-500 border-teal-500 shadow-teal-500/25"
                                            trend={bookingStats.completedTrend}
                                            subtitle={`${bookingStats.completionRate}% completion rate`}
                                            badge="Finished"
                                            detail="Completed repairs that are verified and handed over to customer."
                                            isActive={kpiFilter === 'completed'}
                                            onClick={() => setKpiFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                        />
                                        <EnhancedKPICard
                                            title="Active Repairs"
                                            value={bookingStats.upcoming}
                                            icon={<Activity className="w-5 h-5 text-amber-400" />}
                                            gradient="bg-gradient-to-br from-amber-600/30 to-orange-900/40"
                                            glowBorder="ring-amber-500 border-amber-500 shadow-amber-500/25"
                                            subtitle={`${bookingStats.todayBookings} scheduled for today`}
                                            badge="In-Shop"
                                            detail="Vehicles currently being serviced, in progress, or mechanics en route."
                                            isActive={kpiFilter === 'active'}
                                            onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                                        />
                                    </>
                                );
                            }

                            // 2. CAR RENTAL TAB (Vehicles, Fleets, Handovers)
                            if (activeAdminTab === 'Car Rental') {
                                return (
                                    <>
                                        <EnhancedKPICard
                                            title="Total Rentals"
                                            value={bookingStats.total}
                                            icon={<Car className="w-5 h-5 text-blue-400" />}
                                            gradient="bg-gradient-to-br from-blue-600/30 to-indigo-900/40"
                                            glowBorder="ring-blue-500 border-blue-500 shadow-blue-500/25"
                                            trend={bookingStats.totalTrend}
                                            subtitle={`${bookingStats.total} car booking${bookingStats.total === 1 ? '' : 's'}`}
                                            badge="Fleet Bookings"
                                            detail="Total car rental bookings submitted by clients."
                                            isActive={kpiFilter === 'total'}
                                            onClick={() => setKpiFilter(prev => prev === 'total' ? 'all' : 'total')}
                                        />
                                        <EnhancedKPICard
                                            title="Rental Revenue"
                                            value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                                            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.revenueTrend}
                                            subtitle={bookingStats.pendingRevenue > 0 ? `₱${bookingStats.pendingRevenue.toLocaleString()} pending balance` : 'All rentals fully paid'}
                                            badge="Collected"
                                            detail="Collected rental earnings including initial deposits and settled balances."
                                            isActive={kpiFilter === 'revenue'}
                                            onClick={() => setKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue')}
                                        />
                                        <EnhancedKPICard
                                            title="Returned Safe"
                                            value={bookingStats.completed}
                                            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-teal-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.completedTrend}
                                            subtitle={`${bookingStats.completionRate}% return rate`}
                                            badge="Turned Over"
                                            detail="Rentals successfully returned, inspected, and completed."
                                            isActive={kpiFilter === 'completed'}
                                            onClick={() => setKpiFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                        />
                                        <EnhancedKPICard
                                            title="Cars On The Road"
                                            value={bookingStats.upcoming}
                                            icon={<Navigation className="w-5 h-5 text-orange-400" />}
                                            gradient="bg-gradient-to-br from-orange-600/30 to-rose-900/40"
                                            glowBorder="ring-orange-500 border-orange-500 shadow-orange-500/25"
                                            subtitle={`${bookingStats.todayBookings} pick-up${bookingStats.todayBookings === 1 ? '' : 's'} today`}
                                            badge="On Trip"
                                            detail="Rental cars currently out with clients or approved for release."
                                            isActive={kpiFilter === 'active'}
                                            onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                                        />
                                    </>
                                );
                            }

                            // 3. DRIVER FOR HIRE TAB (Chauffeurs, Trips, Pickups)
                            if (activeAdminTab === 'Driver for Hire') {
                                return (
                                    <>
                                        <EnhancedKPICard
                                            title="Total Trips"
                                            value={bookingStats.total}
                                            icon={<UserCheck className="w-5 h-5 text-blue-400" />}
                                            gradient="bg-gradient-to-br from-blue-600/30 to-cyan-900/40"
                                            glowBorder="ring-blue-500 border-blue-500 shadow-blue-500/25"
                                            trend={bookingStats.totalTrend}
                                            subtitle={`${bookingStats.total} trip${bookingStats.total === 1 ? '' : 's'} requested`}
                                            badge="Chauffeur"
                                            detail="All driver-for-hire booking requests received from customers."
                                            isActive={kpiFilter === 'total'}
                                            onClick={() => setKpiFilter(prev => prev === 'total' ? 'all' : 'total')}
                                        />
                                        <EnhancedKPICard
                                            title="Trip Earnings"
                                            value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                                            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.revenueTrend}
                                            subtitle={bookingStats.pendingRevenue > 0 ? `₱${bookingStats.pendingRevenue.toLocaleString()} unpaid trips` : 'All trips paid'}
                                            badge="Revenue"
                                            detail="Total revenue earned and collected from chauffeur & driver hires."
                                            isActive={kpiFilter === 'revenue'}
                                            onClick={() => setKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue')}
                                        />
                                        <EnhancedKPICard
                                            title="Trips Completed"
                                            value={bookingStats.completed}
                                            icon={<CheckCircle className="w-5 h-5 text-teal-400" />}
                                            gradient="bg-gradient-to-br from-teal-600/30 to-teal-900/40"
                                            glowBorder="ring-teal-500 border-teal-500 shadow-teal-500/25"
                                            trend={bookingStats.completedTrend}
                                            subtitle={`${bookingStats.completionRate}% safe arrival rate`}
                                            badge="Safe Drop-off"
                                            detail="Trips where passengers were safely transported and drop-off completed."
                                            isActive={kpiFilter === 'completed'}
                                            onClick={() => setKpiFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                        />
                                        <EnhancedKPICard
                                            title="Drivers On Duty"
                                            value={bookingStats.upcoming}
                                            icon={<Clock className="w-5 h-5 text-amber-400" />}
                                            gradient="bg-gradient-to-br from-amber-600/30 to-orange-900/40"
                                            glowBorder="ring-amber-500 border-amber-500 shadow-amber-500/25"
                                            subtitle={`${bookingStats.todayBookings} scheduled for today`}
                                            badge="Dispatched"
                                            detail="Drivers currently assigned to client, traveling, or on duty."
                                            isActive={kpiFilter === 'active'}
                                            onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                                        />
                                    </>
                                );
                            }

                            // 4. LIAISON TAB (LTO, Registrations, Government Processing)
                            if (activeAdminTab === 'Liaison') {
                                return (
                                    <>
                                        <EnhancedKPICard
                                            title="Total Filings"
                                            value={bookingStats.total}
                                            icon={<FileText className="w-5 h-5 text-blue-400" />}
                                            gradient="bg-gradient-to-br from-blue-600/30 to-indigo-900/40"
                                            glowBorder="ring-blue-500 border-blue-500 shadow-blue-500/25"
                                            trend={bookingStats.totalTrend}
                                            subtitle={`${bookingStats.total} document task${bookingStats.total === 1 ? '' : 's'}`}
                                            badge="LTO & Docs"
                                            detail="Total document assistance, vehicle registration, and liaison requests."
                                            isActive={kpiFilter === 'total'}
                                            onClick={() => setKpiFilter(prev => prev === 'total' ? 'all' : 'total')}
                                        />
                                        <EnhancedKPICard
                                            title="Filing Fees Collected"
                                            value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                                            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.revenueTrend}
                                            subtitle={bookingStats.pendingRevenue > 0 ? `₱${bookingStats.pendingRevenue.toLocaleString()} pending fees` : 'All filing fees paid'}
                                            badge="Collected"
                                            detail="Processing fees paid by customers for vehicle documentation."
                                            isActive={kpiFilter === 'revenue'}
                                            onClick={() => setKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue')}
                                        />
                                        <EnhancedKPICard
                                            title="Papers Released"
                                            value={bookingStats.completed}
                                            icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
                                            gradient="bg-gradient-to-br from-emerald-600/30 to-teal-900/40"
                                            glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                            trend={bookingStats.completedTrend}
                                            subtitle={`${bookingStats.completionRate}% release success`}
                                            badge="Finished"
                                            detail="Processed official LTO certificates and documents delivered to owner."
                                            isActive={kpiFilter === 'completed'}
                                            onClick={() => setKpiFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                        />
                                        <EnhancedKPICard
                                            title="At LTO / In Process"
                                            value={bookingStats.upcoming}
                                            icon={<Activity className="w-5 h-5 text-amber-400" />}
                                            gradient="bg-gradient-to-br from-amber-600/30 to-rose-900/40"
                                            glowBorder="ring-amber-500 border-amber-500 shadow-amber-500/25"
                                            subtitle={`${bookingStats.todayBookings} new filings today`}
                                            badge="Processing"
                                            detail="Documents currently under verification or being filed at the government agency."
                                            isActive={kpiFilter === 'active'}
                                            onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                                        />
                                    </>
                                );
                            }

                            // 5. TOWING TAB (Roadside Assistance, Emergencies, Wreckers)
                            return (
                                <>
                                    <EnhancedKPICard
                                        title="Total Tow Calls"
                                        value={bookingStats.total}
                                        icon={<Truck className="w-5 h-5 text-blue-400" />}
                                        gradient="bg-gradient-to-br from-blue-600/30 to-cyan-900/40"
                                        glowBorder="ring-blue-500 border-blue-500 shadow-blue-500/25"
                                        trend={bookingStats.totalTrend}
                                        subtitle={`${bookingStats.total} rescue call${bookingStats.total === 1 ? '' : 's'}`}
                                        badge="Emergency"
                                        detail="All emergency towing and roadside assistance calls logged."
                                        isActive={kpiFilter === 'total'}
                                        onClick={() => setKpiFilter(prev => prev === 'total' ? 'all' : 'total')}
                                    />
                                    <EnhancedKPICard
                                        title="Rescue Revenue"
                                        value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                                        icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                                        gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/40"
                                        glowBorder="ring-emerald-500 border-emerald-500 shadow-emerald-500/25"
                                        trend={bookingStats.revenueTrend}
                                        subtitle={bookingStats.pendingRevenue > 0 ? `₱${bookingStats.pendingRevenue.toLocaleString()} pending collection` : 'All towings paid'}
                                        badge="Collected"
                                        detail="Collected fees for roadside towing and vehicle recoveries."
                                        isActive={kpiFilter === 'revenue'}
                                        onClick={() => setKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue')}
                                    />
                                    <EnhancedKPICard
                                        title="Rescues Completed"
                                        value={bookingStats.completed}
                                        icon={<ShieldCheck className="w-5 h-5 text-teal-400" />}
                                        gradient="bg-gradient-to-br from-teal-600/30 to-teal-900/40"
                                        glowBorder="ring-teal-500 border-teal-500 shadow-teal-500/25"
                                        trend={bookingStats.completedTrend}
                                        subtitle={`${bookingStats.completionRate}% rescue rate`}
                                        badge="Delivered"
                                        detail="Vehicles safely towed and delivered to destination or garage."
                                        isActive={kpiFilter === 'completed'}
                                        onClick={() => setKpiFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                    />
                                    <EnhancedKPICard
                                        title="Trucks Dispatched"
                                        value={bookingStats.upcoming}
                                        icon={<Zap className="w-5 h-5 text-red-400" />}
                                        gradient="bg-gradient-to-br from-rose-600/30 to-red-900/40"
                                        glowBorder="ring-red-500 border-red-500 shadow-red-500/25"
                                        subtitle={`${bookingStats.todayBookings} call${bookingStats.todayBookings === 1 ? '' : 's'} today`}
                                        badge="Urgent Live"
                                        detail="Tow trucks and wrecker units actively dispatched or pending on the road."
                                        isActive={kpiFilter === 'active'}
                                        onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                                    />
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Filters Section */}
                <div className="relative z-40 group mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-primary to-rose-600 rounded-2xl blur opacity-10 group-hover:opacity-15 transition duration-1000"></div>
                    <div className="relative bg-[#121212]/90 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-xl space-y-2.5">

                        {/* Top Controls Row: Search + Quick Range + Dropdowns + Clear */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
                            
                            {/* Modern Search Widget with Auto-Dropdown Results */}
                            <div className="flex-1 relative z-50" data-search-widget>
                                <div className="relative flex items-center">
                                    <Search className="absolute left-3.5 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none" size={15} />
                                    <input
                                        id="adminSearchQuery"
                                        name="adminSearchQuery"
                                        type="text"
                                        value={searchQuery}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setIsSearchFocused(true);
                                        }}
                                        placeholder={
                                            activeAdminTab === 'Services' ? "Search Customer, Mechanic, Service, Vehicle..." :
                                            activeAdminTab === 'Car Rental' ? "Search Customer, Car, Plate, Ref..." :
                                            activeAdminTab === 'Driver for Hire' ? "Search Customer, Driver, Destination..." :
                                            activeAdminTab === 'Liaison' ? "Search Customer, Liaison Agent, Plate..." :
                                            "Search Customer, Towing Location, Truck..."
                                        }
                                        className="h-10 w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-9 text-white text-xs font-semibold placeholder-gray-500 focus:border-primary/80 focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setIsSearchFocused(false);
                                            }}
                                            className="absolute right-3 text-gray-500 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                                            title="Clear search"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Auto-Suggest Dropdown Results Menu */}
                                {isSearchFocused && searchQuery.trim().length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-[#161618] border border-white/15 rounded-xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between text-[11px] font-bold text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-primary" /> Live Results ({searchSuggestions.length})
                                            </span>
                                            <span className="text-[10px] text-gray-500">Press Esc or click to select</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                                            {searchSuggestions.length > 0 ? (
                                                searchSuggestions.map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSearchQuery(item.title);
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                                item.category === 'Customer' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                                                                item.category === 'Mechanic' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                                item.category === 'Service' ? 'bg-primary/15 text-primary border border-primary/20' :
                                                                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                            }`}>
                                                                {item.category === 'Customer' && <Users size={13} />}
                                                                {item.category === 'Mechanic' && <UserCheck size={13} />}
                                                                {item.category === 'Service' && <Wrench size={13} />}
                                                                {item.category === 'Vehicle' && <Car size={13} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 truncate">
                                                                    {item.subtitle}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 group-hover:border-primary/40 group-hover:text-primary flex-shrink-0">
                                                            {item.badgeText}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-5 text-center text-gray-500 text-xs">
                                                    No direct matches found for "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Filters Group */}
                            <div className="flex flex-wrap items-center gap-2 relative z-50">
                                
                                {/* 1. Quick Range Filter Dropdown (Inline right after Search) */}
                                <div className="relative" data-filter-dropdown>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveOpenFilter(activeOpenFilter === 'range' ? null : 'range');
                                        }}
                                        className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                            datePreset !== 'all' || dateFilter.start || dateFilter.end
                                                ? 'bg-primary/15 border-primary/40 text-primary shadow-lg shadow-primary/10'
                                                : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20'
                                        }`}
                                    >
                                        {datePreset === 'today' ? <Clock size={14} className="text-primary" /> :
                                         datePreset === 'week' ? <CalendarDays size={14} className="text-primary" /> :
                                         datePreset === 'month' ? <CalendarRange size={14} className="text-primary" /> :
                                         datePreset === 'custom' ? <Filter size={14} className="text-primary" /> :
                                         <Calendar size={14} className="text-gray-400" />}
                                        
                                        <span>
                                            {datePreset === 'all' ? 'All Dates' :
                                             datePreset === 'today' ? 'Today' :
                                             datePreset === 'week' ? 'This Week' :
                                             datePreset === 'month' ? 'This Month' : 'Custom Range'}
                                        </span>
                                        <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${activeOpenFilter === 'range' ? 'rotate-180 text-primary' : ''}`} />
                                    </button>

                                        {activeOpenFilter === 'range' && (
                                        <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 min-w-[280px] w-max max-w-xs z-[100] bg-[#161618] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                                                <span>Quick Date Range</span>
                                                <Calendar size={12} className="text-primary" />
                                            </div>
                                            {[
                                                { id: 'all', label: 'All Dates', icon: Calendar, desc: 'Show all bookings without date restrictions' },
                                                { id: 'today', label: 'Today', icon: Clock, desc: 'Bookings scheduled for today only' },
                                                { id: 'week', label: 'This Week', icon: CalendarDays, desc: 'Bookings scheduled within this calendar week' },
                                                { id: 'month', label: 'This Month', icon: CalendarRange, desc: 'Bookings scheduled within this calendar month' },
                                                { id: 'custom', label: 'Custom Range...', icon: Filter, desc: 'Manually pick custom start & end date' }
                                            ].map(opt => {
                                                const IconComponent = opt.icon;
                                                const isSelected = datePreset === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (opt.id === 'custom') {
                                                                setDatePreset('custom');
                                                            } else {
                                                                handleDatePreset(opt.id);
                                                            }
                                                            setActiveOpenFilter(null);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer ${
                                                            isSelected ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2.5 min-w-0">
                                                            <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${isSelected ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>
                                                                <IconComponent size={13} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-xs leading-snug">{opt.label}</p>
                                                                <p className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">{opt.desc}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* 2. Mechanic Filter Dropdown (Services tab) */}
                                {activeAdminTab === 'Services' && (
                                    <div className="relative" data-filter-dropdown>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveOpenFilter(activeOpenFilter === 'mechanic' ? null : 'mechanic');
                                            }}
                                            className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                                selectedMechanicId !== 'all'
                                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10'
                                                    : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20'
                                            }`}
                                        >
                                            <Users size={14} className={selectedMechanicId !== 'all' ? 'text-amber-400' : 'text-gray-400'} />
                                            <span className="max-w-[150px] truncate">
                                                {selectedMechanicId === 'all'
                                                    ? 'All Mechanics'
                                                    : (mechanics.find(m => m.id === selectedMechanicId)?.name || 'Mechanic')}
                                            </span>
                                            <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${activeOpenFilter === 'mechanic' ? 'rotate-180 text-amber-400' : ''}`} />
                                        </button>

                                        {activeOpenFilter === 'mechanic' && (
                                            <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 min-w-[300px] w-max max-w-sm z-[100] bg-[#161618] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                                                    <span>Assignee / Mechanic</span>
                                                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                        {mechanics.filter(m => m.status === 'Active').length} Active
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMechanicId('all');
                                                        setActiveOpenFilter(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                                                        selectedMechanicId === 'all' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-lg bg-white/10 text-gray-300 flex items-center justify-center flex-shrink-0 font-black text-[11px]">
                                                            <Users size={13} />
                                                        </div>
                                                        <span>All Mechanics</span>
                                                    </div>
                                                    {selectedMechanicId === 'all' && <Check size={14} className="text-amber-400" />}
                                                </button>
                                                <div className="my-1 border-t border-white/5" />
                                                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                    {mechanics.filter(m => m.status === 'Active').map(mechanic => {
                                                        const isSelected = selectedMechanicId === mechanic.id;
                                                        return (
                                                            <button
                                                                key={mechanic.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedMechanicId(mechanic.id);
                                                                    setActiveOpenFilter(null);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer ${
                                                                    isSelected ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-black text-[11px] flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                                                                        {mechanic.name.charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-xs text-white leading-snug whitespace-normal break-words">{mechanic.name}</p>
                                                                        <p className="text-[10px] text-gray-400 font-normal leading-tight flex items-center gap-1.5 mt-0.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                                                            <span>{mechanic.specialty || 'General Mechanic'}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {isSelected && <Check size={14} className="text-amber-400 flex-shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. Status Filter Dropdown */}
                                <div className="relative" data-filter-dropdown>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveOpenFilter(activeOpenFilter === 'status' ? null : 'status');
                                        }}
                                        className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                            selectedStatus !== 'all'
                                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                                                : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20'
                                        }`}
                                    >
                                        <Activity size={14} className={selectedStatus !== 'all' ? 'text-blue-400' : 'text-gray-400'} />
                                        <span className="max-w-[140px] truncate">
                                            {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
                                        </span>
                                        <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${activeOpenFilter === 'status' ? 'rotate-180 text-blue-400' : ''}`} />
                                    </button>

                                    {activeOpenFilter === 'status' && (
                                        <div className="absolute right-0 top-full mt-2 min-w-[280px] w-max max-w-sm z-[100] bg-[#161618] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                                                <span>Booking Status</span>
                                                <Activity size={12} className="text-blue-400" />
                                            </div>
                                            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                {bookingStatuses.map(status => {
                                                    const isSelected = selectedStatus === status;
                                                    const dotColor = 
                                                        status === 'all' ? 'bg-gray-400' :
                                                        status === 'Completed' || status === 'Approved' ? 'bg-emerald-400' :
                                                        status === 'Cancelled' ? 'bg-rose-400' :
                                                        status === 'In Progress' || status === 'En Route' || status === 'Dispatched' || status === 'LTO Processing' ? 'bg-blue-400' :
                                                        'bg-amber-400';
                                                    
                                                    return (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedStatus(status as any);
                                                                setActiveOpenFilter(null);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer ${
                                                                isSelected ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0 ring-2 ring-white/10`} />
                                                                <span className="whitespace-normal leading-snug">{status === 'all' ? 'All Statuses' : status}</span>
                                                            </div>
                                                            {isSelected && <Check size={14} className="text-blue-400 flex-shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Payment Filter Dropdown */}
                                <div className="relative" data-filter-dropdown>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveOpenFilter(activeOpenFilter === 'payment' ? null : 'payment');
                                        }}
                                        className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                            paymentFilter !== 'all'
                                                ? paymentFilter === 'paid'
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                                    : 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10'
                                                : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20'
                                        }`}
                                    >
                                        <DollarSign size={14} className={
                                            paymentFilter === 'paid' ? 'text-emerald-400' :
                                            paymentFilter === 'unpaid' ? 'text-amber-400' :
                                            'text-gray-400'
                                        } />
                                        <span>
                                            {paymentFilter === 'all' ? 'All Payments' :
                                             paymentFilter === 'paid' ? 'Paid Only' : 'Unpaid Only'}
                                        </span>
                                        <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${activeOpenFilter === 'payment' ? 'rotate-180 text-primary' : ''}`} />
                                    </button>

                                    {activeOpenFilter === 'payment' && (
                                        <div className="absolute right-0 top-full mt-2 min-w-[260px] w-max max-w-xs z-[100] bg-[#161618] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                                                <span>Payment Filter</span>
                                                <DollarSign size={12} className="text-emerald-400" />
                                            </div>
                                            {[
                                                { id: 'all', label: 'All Payments', desc: 'Show all paid and unpaid bookings', icon: DollarSign, color: 'text-gray-400' },
                                                { id: 'paid', label: 'Paid Only', desc: 'Bookings with 100% completed payment', icon: CheckCircle, color: 'text-emerald-400' },
                                                { id: 'unpaid', label: 'Unpaid Only', desc: 'Bookings with outstanding balance', icon: Clock, color: 'text-amber-400' }
                                            ].map(opt => {
                                                const isSelected = paymentFilter === opt.id;
                                                const IconComponent = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setPaymentFilter(opt.id as any);
                                                            setActiveOpenFilter(null);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer ${
                                                            isSelected ? 'bg-white/15 text-white border border-white/25 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2.5 min-w-0">
                                                            <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${isSelected ? 'bg-white text-black' : 'bg-white/5 ' + opt.color}`}>
                                                                <IconComponent size={13} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-xs leading-snug">{opt.label}</p>
                                                                <p className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">{opt.desc}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>


                                {/* Clear Filters Quick Action */}
                                {activeFiltersCount > 0 && (
                                    <Tooltip content="Reset all active filters and search">
                                        <button
                                            type="button"
                                            onClick={clearAllFilters}
                                            className="h-10 px-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                                        >
                                            <X size={13} />
                                            <span>Clear ({activeFiltersCount})</span>
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        {/* Custom Date Range Picker Row (Revealed when datePreset === 'custom' or custom dates entered) */}
                        {(datePreset === 'custom' || dateFilter.start || dateFilter.end) && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                                        <Calendar size={13} className="text-primary" /> Start Date:
                                    </span>
                                    <input
                                        id="dateFilterStart"
                                        name="dateFilterStart"
                                        type="date"
                                        value={dateFilter.start}
                                        onChange={e => { setDateFilter(prev => ({ ...prev, start: e.target.value })); setDatePreset('custom'); }}
                                        className="h-8 bg-white/5 border border-white/10 rounded-lg px-2.5 text-white font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs transition-all hover:bg-white/10 cursor-pointer"
                                    />
                                </div>
                                <span className="text-gray-500 font-black">-</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-400">End Date:</span>
                                    <input
                                        id="dateFilterEnd"
                                        name="dateFilterEnd"
                                        type="date"
                                        value={dateFilter.end}
                                        min={dateFilter.start}
                                        onChange={e => { setDateFilter(prev => ({ ...prev, end: e.target.value })); setDatePreset('custom'); }}
                                        className="h-8 bg-white/5 border border-white/10 rounded-lg px-2.5 text-white font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs transition-all hover:bg-white/10 cursor-pointer"
                                    />
                                </div>
                                {(dateFilter.start || dateFilter.end) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDateFilter({ start: '', end: '' });
                                            setDatePreset('all');
                                        }}
                                        className="text-[10px] font-bold text-gray-400 hover:text-white underline ml-1"
                                    >
                                        Reset Date Range
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
            
            {/* Enhanced Table */}
            <div className="flex-1 overflow-auto space-y-6 relative z-10">
                {/* Desktop View */}
                <div className="hidden md:block bg-[#121212]/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto relative custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px] w-12"></th>
                                <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by customer name">
                                        <button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            Customer {getSortIndicator('customerName')}
                                        </button>
                                    </Tooltip>
                                </th>
                                {activeAdminTab === 'Services' && (
                                    <>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Service</th>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px] hidden lg:table-cell">Vehicle</th>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">
                                            <Tooltip content="Sort by mechanic name">
                                                <button onClick={() => requestSort('mechanicName')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                                    Mechanic {getSortIndicator('mechanicName')}
                                                </button>
                                            </Tooltip>
                                        </th>
                                    </>
                                )}
                                {activeAdminTab === 'Car Rental' && (
                                    <>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Car Model</th>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Rental Period</th>
                                    </>
                                )}
                                {activeAdminTab === 'Driver for Hire' && (
                                    <>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Driver Requirements</th>
                                    </>
                                )}
                                {activeAdminTab === 'Liaison' && (
                                    <>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">LTO Action</th>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px] hidden lg:table-cell">Vehicle</th>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Agent Assigned</th>
                                    </>
                                )}
                                {activeAdminTab === 'Towing' && (
                                    <>
                                        <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Details & Location</th>
                                    </>
                                )}
                                <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by date">
                                        <button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            Date {getSortIndicator('date')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px] text-right">
                                    <Tooltip content="Sort by price">
                                        <button onClick={() => requestSort('price')} className="flex items-center gap-2 hover:text-white ml-auto transition-colors group">
                                            Price {getSortIndicator('price')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500 tracking-[0.2em] text-[10px]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedAndFilteredBookings.length > 0 ? (
                                sortedAndFilteredBookings.map((booking, index) => (
                                    <React.Fragment key={booking.id}>
                                        <tr
                                            onClick={() => toggleRow(booking.id)}
                                            className={`transition-all duration-200 hover:bg-white/[0.02] group cursor-pointer ${index % 2 === 0 ? '' : 'bg-white/[0.01]'} ${expandedBookingId === booking.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                        >
                                            <td className="py-2 px-3 text-center">
                                                <Tooltip content={expandedBookingId === booking.id ? 'Collapse details' : 'Expand details'}>
                                                    <div className="flex justify-center">
                                                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedBookingId === booking.id ? 'rotate-180 text-primary' : 'text-gray-600'}`} />
                                                    </div>
                                                </Tooltip>
                                            </td>
                                            <td className="py-2 px-3">
                                                {(() => {
                                                    const customerObj = db.customers.find(c => 
                                                        (booking.customerId && c.id === booking.customerId) || 
                                                        (c.name && booking.customerName && c.name.toLowerCase() === booking.customerName.toLowerCase()) ||
                                                        (booking.customerPhone && c.phone === booking.customerPhone)
                                                    );
                                                    const avatarUrl = customerObj?.picture || (booking as any).customerPhoto;
                                                    return (
                                                        <div className="flex items-center gap-2.5 max-w-[160px]">
                                                            {avatarUrl ? (
                                                                <img 
                                                                    src={avatarUrl} 
                                                                    alt={booking.customerName} 
                                                                    className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" 
                                                                    onError={(e) => {
                                                                        const img = e.currentTarget;
                                                                        if (img.src !== MOCKUPS.DEFAULT_AVATAR) {
                                                                            img.src = MOCKUPS.DEFAULT_AVATAR;
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                                                    {booking.customerName.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-black text-white text-[11px] truncate leading-tight" title={booking.customerName}>
                                                                    {booking.customerName}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-[9px] text-gray-500 font-black font-mono tracking-wider">{bookingSequences[booking.id] || booking.id}</span>
                                                                    {(((booking.createdAt && (new Date().getTime() - new Date(booking.createdAt).getTime()) < 24 * 60 * 60 * 1000) || 
                                                                      (!booking.createdAt && booking.date === new Date().toISOString().split('T')[0])) && 
                                                                      booking.status !== 'Completed' && booking.status !== 'Cancelled') && (
                                                                        <span className="px-1 py-[1px] rounded bg-gradient-to-r from-orange-500 to-red-500 text-white text-[6px] font-black uppercase tracking-wider animate-pulse shrink-0">
                                                                            New
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {activeAdminTab === 'Services' && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        {(() => {
                                                            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                            const firstSvc = svcs[0];
                                                            const names = svcs.map(s => s.name).join(', ') || 'Unknown Service';
                                                            const cats = [...new Set(svcs.map(s => s.category).filter(Boolean))].join(', ') || 'N/A';
                                                            const svcObj = db.services?.find(s => s.id === firstSvc?.id || s.name === firstSvc?.name);
                                                            const svcImg = svcObj?.imageUrl || firstSvc?.imageUrl;
                                                            return (
                                                                <div className="flex items-center gap-2.5 max-w-[200px]">
                                                                    {svcImg ? (
                                                                        <img
                                                                            src={svcImg}
                                                                            alt={names}
                                                                            className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-sky-600/30 border border-blue-500/20 flex items-center justify-center shrink-0">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <p className="font-bold text-gray-300 text-[11px] truncate" title={names}>{names}</p>
                                                                        <span className="inline-block mt-0.5 px-1.5 py-px bg-blue-500/10 text-blue-400 rounded text-[9px] font-black tracking-widest border border-blue-500/20 truncate max-w-full">{cats}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-2 px-3 hidden lg:table-cell">
                                                        {(() => {
                                                            const vImg = booking.vehicle?.imageUrls?.[0];
                                                            const vLabel = `${booking.vehicle?.make || ''} ${booking.vehicle?.model || 'N/A'}`.trim();
                                                            return (
                                                                <div className="flex items-center gap-2.5 max-w-[180px]">
                                                                    {vImg ? (
                                                                        <img
                                                                            src={vImg}
                                                                            alt={vLabel}
                                                                            className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center shrink-0">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <p className="text-[11px] font-bold text-gray-300 truncate" title={vLabel}>{vLabel}</p>
                                                                        <p className="text-[11px] text-gray-600 font-mono mt-0.5 tracking-widest truncate">{booking.vehicle?.plateNumber || 'No Plate'}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {(() => {
                                                            const liveMechanic = db.mechanics.find(m => m.id === booking.mechanicId) || booking.mechanic;
                                                            return liveMechanic ? (
                                                                <div className="flex items-center gap-2.5 max-w-[180px]">
                                                                    {liveMechanic.imageUrl ? (
                                                                        <img 
                                                                            src={liveMechanic.imageUrl} 
                                                                            alt={liveMechanic.name} 
                                                                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" 
                                                                        />
                                                                    ) : (
                                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                                                            {liveMechanic.name.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-bold text-gray-300 text-[11px] truncate" title={liveMechanic.name}>
                                                                            {liveMechanic.name}
                                                                        </span>
                                                                        <span className="text-[9px] text-gray-500 font-bold truncate">
                                                                            {liveMechanic.specializations?.[0] || liveMechanic.specialization || 'Mechanic'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 font-bold text-[11px]">Unassigned</span>
                                                            );
                                                        })()}
                                                    </td>
                                                </>
                                            )}

                                            {activeAdminTab === 'Car Rental' && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <p className="font-bold text-gray-300 text-sm">{(booking.services?.[0]?.name) || 'Car Rental'}</p>
                                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black tracking-widest border border-blue-500/20">RENTAL</span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <p className="text-xs font-bold text-gray-300">{booking.vehicleDesc}</p>
                                                    </td>
                                                </>
                                            )}

                                            {activeAdminTab === 'Driver for Hire' && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <p className="font-bold text-gray-300 text-sm">
                                                            {booking.driverDetails?.name || booking.selectedDriver?.name || 'Driver Service'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={booking.notes}>{booking.notes || 'No special requirements'}</p>
                                                    </td>
                                                </>
                                            )}

                                            {activeAdminTab === 'Liaison' && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <p className="font-black text-white text-[11px] truncate leading-tight">{booking.services?.[0]?.name || 'LTO Liaison'}</p>
                                                    </td>
                                                    <td className="py-2 px-3 hidden lg:table-cell">
                                                        <p className="text-xs font-bold text-gray-300">{booking.vehicle?.make || ''} {booking.vehicle?.model || 'N/A'}</p>
                                                        <p className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-widest">{booking.vehicle?.plateNumber || 'No Plate'}</p>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="text-xs font-bold text-gray-300">{booking.agentName || 'Unassigned'}</span>
                                                        {booking.branchName && <p className="text-[10px] text-gray-500">{booking.branchName}</p>}
                                                    </td>
                                                </>
                                            )}

                                            {activeAdminTab === 'Towing' && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <p className="font-bold text-gray-300 text-sm">Towing Request</p>
                                                        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={booking.notes}>{booking.notes || 'No details provided'}</p>
                                                    </td>
                                                </>
                                            )}
                                            <td className="py-2 px-3 whitespace-nowrap">
                                                <div>
                                                    <p className="font-bold text-white text-[11px]">{booking.date}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">{formatTimeToAmPm(booking.time)}</p>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                {(() => {
                                                    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                    const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
                                                    const addCosts = (booking.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
                                                    const total = originalServicesFee + addCosts;
                                                    const isGcash = booking.paymentMethod === 'GCash';
                                                    const hasReceipt = !!booking.gcashReceiptUrl;
                                                    const isVerified = booking.isVerified;
                                                    const isDeclined = !!booking.gcashDeclineReason;
                                                    
                                                    let paymentBadge = null;
                                                    if (booking.status === 'Cancelled') {
                                                        paymentBadge = (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded border border-red-500/25 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                Cancelled (Aborted)
                                                            </span>
                                                        );
                                                    } else if (booking.isPaid) {
                                                        paymentBadge = (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                Fully Paid
                                                            </span>
                                                        );
                                                    } else if (isGcash) {
                                                        if (isVerified) {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                    Deposit Confirmed (50%)
                                                                </span>
                                                            );
                                                        } else if (isDeclined) {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                    Deposit Declined
                                                                </span>
                                                            );
                                                        } else if (hasReceipt) {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20 text-[8px] font-black tracking-widest uppercase animate-pulse whitespace-nowrap">
                                                                    Pending Approval (50%)
                                                                </span>
                                                            );
                                                        } else {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                    Unpaid (GCash)
                                                                </span>
                                                            );
                                                        }
                                                    } else if (booking.paymentMethod?.includes('HitPay') || booking.hitpayReference || booking.hitpayPaymentRequestId) {
                                                        if (booking.isVerified || booking.hitpayStatus === 'completed' || booking.paymentStatus === 'downpayment_paid' || (booking.paidAmount && booking.paidAmount > 0)) {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                    HitPay 50% DP Verified
                                                                </span>
                                                            );
                                                        } else {
                                                            paymentBadge = (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                    Awaiting HitPay DP
                                                                </span>
                                                            );
                                                        }
                                                    } else if (booking.isVerified || booking.paymentStatus === 'downpayment_paid' || (booking.paidAmount && booking.paidAmount > 0)) {
                                                        paymentBadge = (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                50% DP Verified
                                                            </span>
                                                        );
                                                    } else {
                                                        paymentBadge = (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                Unpaid
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-green-400 text-[11px]">{total > 0 ? `₱${total.toLocaleString()}` : 'For Quotation'}</span>
                                                            {paymentBadge}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border whitespace-nowrap ${statusColors[booking.status]}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedBookingId === booking.id && (
                                            <tr className="bg-white/5 animate-fadeIn">
                                                <td colSpan={9} className="p-3.5 border-b border-white/10 bg-gradient-to-b from-primary/5 to-transparent">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                                                        {/* CUSTOMER & VEHICLE CARD */}
                                                        <div className="flex flex-col h-full">
                                                            <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all group/card h-full flex flex-col">
                                                                <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <Users size={14} />
                                                                    </div>
                                                                    Customer Profile
                                                                </h4>
                                                                <div className="space-y-4 flex-1 flex flex-col">
                                                                    {(() => {
                                                                        const customerObj = db.customers.find(c => 
                                                                            (booking.customerId && c.id === booking.customerId) || 
                                                                            (c.name && booking.customerName && c.name.toLowerCase() === booking.customerName.toLowerCase()) ||
                                                                            (booking.customerPhone && c.phone === booking.customerPhone)
                                                                        );
                                                                        const avatarUrl = customerObj?.picture || (booking as any).customerPhoto;
                                                                        return (
                                                                            <div className="flex items-center gap-3">
                                                                                {avatarUrl ? (
                                                                                    <img 
                                                                                        src={avatarUrl} 
                                                                                        alt={booking.customerName} 
                                                                                        className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" 
                                                                                        onError={(e) => {
                                                                                            const img = e.currentTarget;
                                                                                            if (img.src !== MOCKUPS.DEFAULT_AVATAR) {
                                                                                                img.src = MOCKUPS.DEFAULT_AVATAR;
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/20 shrink-0">
                                                                                        {booking.customerName.charAt(0).toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-white font-black text-sm leading-tight truncate">{booking.customerName}</p>
                                                                                    <p className="text-[10px] text-gray-500 font-bold mt-1">{db.customers.find(c => c.name === booking.customerName)?.phone || 'No phone'}</p>
                                                                                    <p className="text-[9px] text-gray-600 font-bold mt-0.5 truncate">{customerObj?.email || 'No email'}</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    <div className="pt-3 mt-auto border-t border-white/5">
                                                                        {/* Section Header */}
                                                                        <div className="flex items-center justify-between mb-2.5 px-0.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                                <h4 className="text-[10px] font-black tracking-widest uppercase text-gray-300">Payment Status Breakdown</h4>
                                                                            </div>
                                                                            {booking.paymentMethod && (
                                                                                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 tracking-wider">
                                                                                    {booking.paymentMethod}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-col gap-2">
                                                                            {booking.status === 'Cancelled' && (
                                                                                <div className="p-2.5 bg-red-500/10 rounded-lg border border-red-500/20 text-xs">
                                                                                    <div className="flex items-center gap-1.5 text-red-400 font-black text-[10px] uppercase tracking-wider">
                                                                                        <XCircle size={13} />
                                                                                        Cancelled by Customer
                                                                                    </div>
                                                                                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed italic">
                                                                                        "{booking.cancellationReason || 'Payment checkout was aborted/cancelled at the payment gateway by customer.'}"
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Realtime Financial HUD */}
                                                                            {(() => {
                                                                                const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                                                const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
                                                                                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                                                                                const grandTotal = originalServicesFee + additionalCostsTotal;
                                                                                
                                                                                // Downpayment is always 50% of original services or recorded downpaymentAmount
                                                                                const initialDeposit = (booking.downpaymentAmount != null && Number(booking.downpaymentAmount) > 0)
                                                                                    ? Number(booking.downpaymentAmount)
                                                                                    : (booking.isVerified ? originalServicesFee * 0.5 : (Number(booking.paidAmount) || 0));

                                                                                // Remaining / Final payment amount
                                                                                const computedFinalAmount = Math.max(0, grandTotal - initialDeposit);
                                                                                const isFullySettled = Boolean(booking.isPaid);

                                                                                return (
                                                                                    <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/10 shadow-inner flex flex-col gap-2.5">
                                                                                        {/* Tier 1: Financial Summary Banner (Service, Additionals, Total) */}
                                                                                        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-2 rounded-lg border border-white/5">
                                                                                            {/* 1. Services Fee */}
                                                                                            <div className="flex flex-col min-w-0">
                                                                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider truncate">Service Fee</span>
                                                                                                <span className="text-xs font-black text-white mt-0.5 truncate" title={`₱${originalServicesFee.toLocaleString()}`}>
                                                                                                    {originalServicesFee > 0 ? `₱${originalServicesFee.toLocaleString()}` : 'For Quote'}
                                                                                                </span>
                                                                                                <span className="text-[7px] text-gray-400 font-bold mt-0.5">
                                                                                                    {svcs.length > 1 ? `${svcs.length} Services` : 'Base Fee'}
                                                                                                </span>
                                                                                            </div>

                                                                                            {/* 2. Additional Costs */}
                                                                                            <div className="flex flex-col min-w-0 border-l border-white/10 pl-2">
                                                                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider truncate">Additional</span>
                                                                                                <span className={`text-xs font-black mt-0.5 truncate ${additionalCostsTotal > 0 ? 'text-[#FF7903]' : 'text-gray-400'}`} title={`+₱${additionalCostsTotal.toLocaleString()}`}>
                                                                                                    {additionalCostsTotal > 0 ? `+₱${additionalCostsTotal.toLocaleString()}` : '₱0'}
                                                                                                </span>
                                                                                                <span className="text-[7px] text-gray-400 font-bold mt-0.5">
                                                                                                    {booking.additionalCosts?.length ? `${booking.additionalCosts.length} item(s)` : 'No Extra'}
                                                                                                </span>
                                                                                            </div>

                                                                                            {/* 3. Grand Total Fee */}
                                                                                            <div className="flex flex-col min-w-0 border-l border-white/10 pl-2">
                                                                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider truncate">Total Fee</span>
                                                                                                <span className="text-xs font-black text-green-400 mt-0.5 truncate" title={`₱${grandTotal.toLocaleString()}`}>
                                                                                                    {grandTotal > 0 ? `₱${grandTotal.toLocaleString()}` : 'For Quote'}
                                                                                                </span>
                                                                                                <span className={`text-[7px] font-black uppercase tracking-wider mt-0.5 ${isFullySettled ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                                                    {isFullySettled ? '● Fully Settled' : '○ Balance Due'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Tier 2: 2-Column Payment Installments (1st Deposit vs Final Payment) */}
                                                                                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                                                                                            {/* 1st Payment (50% Deposit) */}
                                                                                            <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-1.5">
                                                                                                <div className="flex items-center justify-between">
                                                                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">1st Payment (50%)</span>
                                                                                                    {(booking.isVerified || initialDeposit > 0) && (
                                                                                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-black uppercase px-1 py-0.2 rounded">
                                                                                                            PAID
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="text-[12px] font-black text-emerald-400 font-mono">
                                                                                                    {initialDeposit > 0 ? `₱${initialDeposit.toLocaleString()}` : (originalServicesFee > 0 ? `₱${(originalServicesFee * 0.5).toLocaleString()}` : '—')}
                                                                                                </div>

                                                                                                {(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl) ? (
                                                                                                    <div
                                                                                                        className="rounded-md border border-white/10 overflow-hidden bg-black/40 h-14 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                                                                                        onClick={() => setPreviewImageUrl(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl)}
                                                                                                        title="Click to view receipt"
                                                                                                    >
                                                                                                        <img
                                                                                                            src={booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl}
                                                                                                            alt="1st Payment Receipt"
                                                                                                            className="w-full h-full object-contain"
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : (booking.downpaymentRef || booking.hitpayReference || booking.paymentMethod?.includes('HitPay') || booking.isVerified) ? (
                                                                                                    <div className="rounded-md border border-emerald-500/20 h-14 flex flex-col items-center justify-center text-center p-1 bg-emerald-500/[0.04]">
                                                                                                        <span className="text-[9px] font-bold text-emerald-400">HitPay Online</span>
                                                                                                        <span className="text-[7px] text-gray-400 font-mono mt-0.5 truncate max-w-[90%]">
                                                                                                            {booking.downpaymentRef || booking.hitpayReference || 'Verified Gateway'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="rounded-md border border-white/5 border-dashed h-14 flex flex-col items-center justify-center text-center p-1 bg-black/20">
                                                                                                        <span className="text-[8px] font-bold text-gray-600">Awaiting DP</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Final Payment (Settled or Due) */}
                                                                                            <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-1.5">
                                                                                                <div className="flex items-center justify-between">
                                                                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Final Payment</span>
                                                                                                    {isFullySettled ? (
                                                                                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-black uppercase px-1 py-0.2 rounded">
                                                                                                            PAID
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[7px] font-black uppercase px-1 py-0.2 rounded">
                                                                                                            DUE
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className={`text-[12px] font-black font-mono ${isFullySettled ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                                                    {computedFinalAmount > 0 ? `₱${computedFinalAmount.toLocaleString()}` : (isFullySettled ? '₱0' : 'For Quotation')}
                                                                                                </div>

                                                                                                {booking.gcashBalanceReceiptUrl ? (
                                                                                                    <div
                                                                                                        className="rounded-md border border-white/10 overflow-hidden bg-black/40 h-14 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                                                                                        onClick={() => setPreviewImageUrl(booking.gcashBalanceReceiptUrl)}
                                                                                                        title="Click to view balance receipt"
                                                                                                    >
                                                                                                        <img
                                                                                                            src={booking.gcashBalanceReceiptUrl}
                                                                                                            alt="Final Payment Receipt"
                                                                                                            className="w-full h-full object-contain"
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : (booking.balancePaymentRef || (booking.isPaid && booking.paymentMethod?.includes('HitPay'))) ? (
                                                                                                    <div className="rounded-md border border-emerald-500/20 h-14 flex flex-col items-center justify-center text-center p-1 bg-emerald-500/[0.04]">
                                                                                                        <span className="text-[9px] font-bold text-emerald-400">HitPay Settled</span>
                                                                                                        <span className="text-[7px] text-gray-400 font-mono mt-0.5 truncate max-w-[90%]">
                                                                                                            {booking.balancePaymentRef || 'Full Online Settle'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="rounded-md border border-white/5 border-dashed h-14 flex flex-col items-center justify-center text-center p-1 bg-black/20">
                                                                                                        <span className="text-[8px] font-bold text-gray-600">Awaiting Settle</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Action Toolbar */}
                                                                                        <div className="flex items-center justify-between pt-1 px-0.5 border-t border-white/5">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span className="text-[9px] font-bold text-gray-400">Status:</span>
                                                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isFullySettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : booking.isVerified ? 'bg-primary/10 text-primary border-primary/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                                                                    {isFullySettled ? 'Complete Paid' : booking.isVerified ? 'DP Confirmed' : 'Pending Payment'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); setPriceDetailsBooking(booking); }}
                                                                                                    className="px-2.5 py-1 bg-[#FF7903] hover:bg-[#e06800] text-white font-black text-[9px] uppercase tracking-wider rounded-md transition-colors shadow-sm active:scale-95"
                                                                                                >
                                                                                                    DETAILS
                                                                                                </button>
                                                                                                {!booking.isPaid && booking.status !== 'Cancelled' && booking.paymentMethod !== 'GCash' && (
                                                                                                    <Tooltip content="Mark as fully paid">
                                                                                                        <button
                                                                                                            onClick={(e) => { e.stopPropagation(); handleMarkPaid(booking.id); }}
                                                                                                            className="p-1.5 bg-green-500/10 text-green-400 rounded-md hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                                                                                                        >
                                                                                                            <DollarSign size={12} />
                                                                                                        </button>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                                {booking.isPaid && (
                                                                                                    <Tooltip content="Payment 100% verified">
                                                                                                        <div className="p-1.5 bg-green-500/10 text-green-400 rounded-md border border-green-500/20">
                                                                                                            <CheckCircle size={12} />
                                                                                                        </div>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {!booking.isVerified && (booking.gcashReference || booking.gcashReceiptUrl) && (
                                                                                            <div className="pt-0.5">
                                                                                                <Tooltip content="Verify GCash payment" className="w-full">
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); verifyBookingPayment(booking.id); }}
                                                                                                        className="w-full h-8 py-1.5 bg-[#FF7903] hover:bg-[#e06800] text-white font-black tracking-widest text-[9px] rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                                                                                                    >
                                                                                                        <ShieldCheck size={11} /> Verify Payment
                                                                                                    </button>
                                                                                                </Tooltip>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                                        {/* SERVICE & MANAGEMENT CARD */}
                                                        <div className="flex flex-col h-full">
                                                            <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all h-full flex flex-col">
                                                                <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <Wrench size={14} />
                                                                    </div>
                                                                    Service Details
                                                                </h4>
                                                                <div className="space-y-3 flex-1 flex flex-col">
                                                                    {activeAdminTab === 'Services' && (() => {
                                                                        const svcs = booking.services && booking.services.length > 0 ? booking.services : (booking.service ? [booking.service] : []);
                                                                        const durParts = svcs.map(s => s.estimatedTime || (s.duration ? `${s.duration} mins` : null)).filter(Boolean);
                                                                        const durationText = durParts.length > 0 ? durParts.join(' + ') : (booking.service?.estimatedTime || (booking.service?.duration ? `${booking.service.duration} mins` : '45 - 60 mins'));
                                                                        const categoryText = booking.service?.category || svcs[0]?.category || 'Auto Care';
                                                                        const isLiveActive = booking.status === 'In Progress' || booking.status === 'En Route';

                                                                        return (
                                                                            <>
                                                                                {/* Service Hero Banner */}
                                                                                <div className="flex gap-3 items-start bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                                                                                    <div className="relative shrink-0">
                                                                                        <img 
                                                                                            src={booking.service?.imageUrl || getFallbackImageForCategory(booking.service?.category)} 
                                                                                            alt={booking.service?.name || 'Service'} 
                                                                                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md"
                                                                                            onError={(e) => {
                                                                                                (e.target as HTMLImageElement).src = getFallbackImageForCategory(booking.service?.category);
                                                                                            }}
                                                                                        />
                                                                                        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-black/80 border border-primary/40 rounded text-[7px] font-black text-primary uppercase font-mono">
                                                                                            {categoryText}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center justify-between gap-1">
                                                                                            <p className="text-primary font-black text-xs leading-tight truncate" title={booking.service?.name}>
                                                                                                {booking.service?.name || 'Automotive Service'}
                                                                                            </p>
                                                                                            {isLiveActive && (
                                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[7.5px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                                                                                    Live
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-[9.5px] text-gray-400 mt-1 leading-normal line-clamp-2" title={booking.service?.description}>
                                                                                            {booking.service?.description || 'Professional diagnostic and repair maintenance for your vehicle.'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Service Metrics Row: Duration, Scheduled Slot & Status */}
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {/* Duration HUD */}
                                                                                    <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center gap-2 hover:border-primary/20 transition-all">
                                                                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                                                            <Clock size={13} />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">Est. Duration</p>
                                                                                            <p className="text-[11px] font-black text-white mt-0.5 font-mono truncate" title={durationText}>
                                                                                                {durationText}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Scheduled Slot HUD */}
                                                                                    <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center gap-2 hover:border-primary/20 transition-all">
                                                                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                                                            <Calendar size={13} />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">Appointment</p>
                                                                                            <p className="text-[11px] font-black text-white mt-0.5 font-mono truncate" title={`${booking.date} at ${formatTimeToAmPm(booking.time)}`}>
                                                                                                {booking.date}
                                                                                            </p>
                                                                                            <p className="text-[8px] font-bold text-primary font-mono truncate">
                                                                                                {formatTimeToAmPm(booking.time)}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Assigned Mechanic Real-Time HUD */}
                                                                                <div className="pt-2 border-t border-white/5 mt-auto">
                                                                                    <div className="flex items-center justify-between mb-1.5 ml-0.5">
                                                                                        <h4 className="text-[9px] font-black tracking-widest text-gray-500 uppercase">Assigned Mechanic</h4>
                                                                                        {booking.mechanic && (
                                                                                            <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 font-mono">
                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                                                On Duty
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {booking.mechanic ? (() => {
                                                                                        const rawRating = Number(booking.mechanic.rating ?? 5.0);
                                                                                        const roundedRating = isNaN(rawRating) ? '5.0' : (rawRating % 1 === 0 ? rawRating.toFixed(0) : rawRating.toFixed(1));
                                                                                        const reviewsCount = booking.mechanic.reviews || booking.mechanic.reviewsCount || 0;
                                                                                        const primarySpec = (booking.mechanic.specializations && booking.mechanic.specializations[0]) || (booking.mechanic.specialties && booking.mechanic.specialties[0]) || 'Master Technician';

                                                                                        return (
                                                                                            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-2">
                                                                                                <div className="flex items-center gap-2.5">
                                                                                                    <div className="relative shrink-0">
                                                                                                        {booking.mechanic.imageUrl ? (
                                                                                                            <img
                                                                                                                src={getProfileImage(booking.mechanic.imageUrl, 'mechanic')}
                                                                                                                alt={booking.mechanic.name}
                                                                                                                className="w-9 h-9 rounded-xl object-cover border border-white/10 shadow-sm"
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-xs font-black text-primary">
                                                                                                                {booking.mechanic.name.charAt(0)}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#151515]" />
                                                                                                    </div>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <div className="flex items-center justify-between gap-1">
                                                                                                            <p className="font-black text-white text-xs truncate leading-tight">{booking.mechanic.name}</p>
                                                                                                            <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                                                                                                                Active
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                                                            <span className="text-yellow-400 font-black text-[10px] flex items-center gap-0.5 font-mono">
                                                                                                                ⭐ {roundedRating}
                                                                                                            </span>
                                                                                                            <span className="text-[8px] text-gray-400 font-bold font-mono">
                                                                                                                ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                                        {booking.mechanic.phone && (
                                                                                                            <Tooltip content={`Call ${booking.mechanic.name} (${booking.mechanic.phone})`}>
                                                                                                                <a
                                                                                                                    href={`tel:${booking.mechanic.phone}`}
                                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
                                                                                                                >
                                                                                                                    <Phone size={11} />
                                                                                                                </a>
                                                                                                            </Tooltip>
                                                                                                        )}
                                                                                                        <Tooltip content="Reassign mechanic">
                                                                                                            <button
                                                                                                                onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                                                                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10 border border-white/5 transition-colors"
                                                                                                            >
                                                                                                                <Edit size={11} />
                                                                                                            </button>
                                                                                                        </Tooltip>
                                                                                                    </div>
                                                                                                </div>
                                                                                                {/* Secondary Metadata Chips */}
                                                                                                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5 text-[8px] font-mono">
                                                                                                    <span className="text-gray-400 truncate max-w-[130px] font-bold" title={primarySpec}>
                                                                                                        🔧 {primarySpec}
                                                                                                    </span>
                                                                                                    <span className="text-primary font-black uppercase tracking-wider shrink-0">
                                                                                                        Elite Verified
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })() : (
                                                                                        <Tooltip content="Assign a mechanic to this booking">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                                                className="w-full py-2 bg-primary text-white font-black tracking-widest text-[9px] rounded-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                                                                                            >
                                                                                                <Users size={12} /> Assign Mechanic
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                </div>
                                                                            </>
                                                                        );
                                                                    })()}

                                                                    {activeAdminTab === 'Liaison' && (
                                                                        <>
                                                                            {/* Service type header */}
                                                                            <div className="flex gap-3 items-start">
                                                                                <img 
                                                                                    src={booking.service?.imageUrl || getFallbackImageForCategory('Liason Services')} 
                                                                                    alt={booking.services?.[0]?.name || 'LTO Liaison Service'} 
                                                                                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).src = getFallbackImageForCategory('Liason Services');
                                                                                    }}
                                                                                />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-primary font-black text-sm leading-tight truncate">{booking.services?.[0]?.name || 'LTO Liaison Service'}</p>
                                                                                    <p className="text-[10px] text-gray-500 mt-0.5">LTO Office: <span className="text-gray-300 font-black">{booking.branchName || 'Any Branch'}</span></p>
                                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Type: <span className="text-gray-300 font-black">{(booking as any).serviceType || booking.services?.[0]?.category || 'General Liaison'}</span></p>
                                                                                </div>
                                                                            </div>

                                                                            {/* Liaison Agent */}
                                                                            <div className="pt-2 border-t border-white/5">
                                                                                <h4 className="text-[9px] font-black tracking-widest text-gray-600 mb-2 ml-1">Liaison Agent</h4>
                                                                                {(() => {
                                                                                    const agentId = (booking as any).agentId || (booking as any).liaisonId;
                                                                                    const agentName = booking.agentName || (booking as any).liaisonName;
                                                                                    const agentObj = db.liaisonStaff?.find((s: any) => s.id === agentId || s.name === agentName);
                                                                                    const staffList = db.liaisonStaff || [];

                                                                                    return (
                                                                                        <div className="space-y-2">
                                                                                            {agentName && agentName !== 'Pending Assignment' && agentName !== 'Assigned Liaison' ? (
                                                                                                <div className="bg-white/5 rounded-xl border border-white/10 p-3 flex gap-3 items-start">
                                                                                                    {agentObj?.imageUrl ? (
                                                                                                        <img
                                                                                                            src={agentObj.imageUrl}
                                                                                                            alt={agentName}
                                                                                                            className="w-14 h-14 rounded-xl object-cover border-2 border-primary/30 shrink-0"
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-xl font-black text-white shrink-0">
                                                                                                            {agentName.charAt(0)}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <p className="text-white font-black text-xs leading-tight">{agentName}</p>
                                                                                                        <p className="text-[9px] text-gray-500 mt-0.5 truncate">{booking.branchName || 'LTO Office'}</p>
                                                                                                        {agentObj?.phone && <p className="text-[9px] text-primary font-bold mt-0.5">{agentObj.phone}</p>}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <p className="text-[9px] text-gray-500 italic ml-1 mb-1">No liaison officer assigned yet.</p>
                                                                                            )}
                                                                                            
                                                                                            {/* Staff assignment dropdown */}
                                                                                            <div className="relative group/assign select-none">
                                                                                                <select 
                                                                                                    value={agentId || 'unassigned'}
                                                                                                    onChange={async (e) => {
                                                                                                        const selectedId = e.target.value;
                                                                                                        const foundStaff = staffList.find((s: any) => s.id === selectedId);
                                                                                                        if (foundStaff) {
                                                                                                            await updateDoc(doc(firestoreDB, 'liaisonBookings', booking.id), {
                                                                                                                liaisonId: foundStaff.id,
                                                                                                                liaisonName: foundStaff.name,
                                                                                                                status: 'Assigned'
                                                                                                            });
                                                                                                            addNotification({ type: 'success', title: 'Liaison Assigned', message: `Assigned ${foundStaff.name} to booking.`, recipientId: 'admin' });
                                                                                                        }
                                                                                                    }}
                                                                                                    onClick={e => e.stopPropagation()}
                                                                                                    className="w-full bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg text-[9px] font-black tracking-widest text-gray-400 hover:text-white hover:border-primary transition-all outline-none appearance-none cursor-pointer"
                                                                                                >
                                                                                                    <option value="unassigned" className="bg-[#121212]">{agentName === 'Pending Assignment' ? 'Select liaison officer to assign...' : 'Change Assignment...'}</option>
                                                                                                    {staffList.map((s: any) => (
                                                                                                        <option key={s.id} value={s.id} className="bg-[#121212]">{s.name} ({s.isAvailable ? 'Available' : 'Busy'})</option>
                                                                                                    ))}
                                                                                                </select>
                                                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover/assign:text-primary transition-colors" size={12} />
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>

                                                                            {/* LTO Vehicle Technical Specs Card */}
                                                                            {(() => {
                                                                                const vDetails = (booking as any).vehicleDetails || (booking as any).vehicle;
                                                                                const plate = vDetails?.plateNumber || booking.plateNumber || 'N/A';
                                                                                const orNo = vDetails?.currentOrNumber || 'Pending / N/A';
                                                                                const crNo = vDetails?.currentCrNumber || 'Pending / N/A';
                                                                                const engNo = vDetails?.engineNumber || 'N/A';
                                                                                const chaNo = vDetails?.chassisNumber || 'N/A';
                                                                                const brandModel = vDetails?.brand || vDetails?.make ? `${vDetails?.year || ''} ${vDetails?.brand || vDetails?.make || ''} ${vDetails?.model || ''}`.trim() : null;

                                                                                return (
                                                                                    <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                                                <Car size={12} className="text-primary" /> Vehicle LTO Technical Specs
                                                                                            </span>
                                                                                            <span className="font-mono text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black border border-primary/20">
                                                                                                {plate}
                                                                                            </span>
                                                                                        </div>
                                                                                        {brandModel && (
                                                                                            <p className="text-xs font-bold text-white leading-tight">{brandModel} {vDetails?.color ? `• ${vDetails.color}` : ''}</p>
                                                                                        )}
                                                                                        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono pt-1">
                                                                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                                                                <p className="text-[7.5px] font-sans text-gray-500 font-bold uppercase">Current OR #</p>
                                                                                                <p className="text-gray-200 font-bold truncate">{orNo}</p>
                                                                                            </div>
                                                                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                                                                <p className="text-[7.5px] font-sans text-gray-500 font-bold uppercase">Current CR #</p>
                                                                                                <p className="text-gray-200 font-bold truncate">{crNo}</p>
                                                                                            </div>
                                                                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                                                                <p className="text-[7.5px] font-sans text-gray-500 font-bold uppercase">Engine Number</p>
                                                                                                <p className="text-gray-200 font-bold truncate">{engNo}</p>
                                                                                            </div>
                                                                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                                                                <p className="text-[7.5px] font-sans text-gray-500 font-bold uppercase">Chassis Number</p>
                                                                                                <p className="text-gray-200 font-bold truncate">{chaNo}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            {/* Appointment & Pickup Info (Row layout) */}
                                                                            <div className="flex flex-col gap-2">
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <Calendar size={13} className="text-primary shrink-0" />
                                                                                    <div>
                                                                                        <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">Appointment Details</p>
                                                                                        <p className="text-[10px] font-black text-white mt-0.5">{booking.date || (booking as any).appointmentDate || 'TBD'} • {booking.time || (booking as any).appointmentTime || ''}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <MapPin size={13} className="text-primary shrink-0" />
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">Pickup Info</p>
                                                                                        <p className="text-[10px] font-black text-white mt-0.5 truncate">{(booking as any).pickupOption || 'Customer Brings'}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {activeAdminTab === 'Car Rental' && (() => {
                                                                        const car = (booking as any).carObj;
                                                                        const startDate = (booking as any).startDate || booking.date;
                                                                        const endDate = (booking as any).endDate || booking.date;
                                                                        
                                                                        // Calculate duration in days
                                                                        let totalDays = 1;
                                                                        if (startDate && endDate) {
                                                                            const s = new Date(startDate).getTime();
                                                                            const e = new Date(endDate).getTime();
                                                                            if (!isNaN(s) && !isNaN(e) && e >= s) {
                                                                                totalDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
                                                                            }
                                                                        }

                                                                        const transmission = car?.transmission || 'Automatic';
                                                                        const seats = car?.seats ? `${car.seats} Seats` : '5-Seater';
                                                                        const fuel = car?.fuelPolicy || car?.engineType || 'Gasoline';
                                                                        const pricePerDay = car?.pricePerDay ? `₱${car.pricePerDay.toLocaleString()}/day` : null;
                                                                        const plate = booking.vehicle?.plateNumber || car?.plateNumber;

                                                                        return (
                                                                            <div className="space-y-2.5">
                                                                                {/* Top Row: Vehicle Header + Mode Badge */}
                                                                                <div className="flex gap-3 items-start">
                                                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 overflow-hidden shadow-inner">
                                                                                        {(booking as any).carImage ? (
                                                                                            <img src={(booking as any).carImage} alt="Car" className="w-full h-full object-cover" />
                                                                                        ) : (
                                                                                            <Car size={22} />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center justify-between gap-1">
                                                                                            <p className="text-primary font-black text-sm leading-tight truncate">
                                                                                                {booking.services?.[0]?.name || `${car?.make || 'Rental'} ${car?.model || 'Vehicle'}`}
                                                                                            </p>
                                                                                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                                                                                                (booking as any).includeDriver 
                                                                                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                                                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                                                            }`}>
                                                                                                {(booking as any).includeDriver ? 'With Driver' : 'Self Drive'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                                            <p className="text-[10px] text-gray-400 leading-normal">
                                                                                                Mode: <span className="text-white font-bold">{booking.deliveryOption || ((booking as any).includeDriver ? 'With Professional Driver' : 'Self Drive')}</span>
                                                                                            </p>
                                                                                            {pricePerDay && (
                                                                                                <span className="text-[9.5px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                                                                    {pricePerDay}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Enhanced Specifications Data Chips */}
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                                                                        <Gauge size={10} className="text-primary" /> {transmission}
                                                                                    </span>
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                                                                        <Users size={10} className="text-cyan-400" /> {seats}
                                                                                    </span>
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                                                                        <Fuel size={10} className="text-amber-400" /> {fuel}
                                                                                    </span>
                                                                                    {plate && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                                                            <Tag size={10} /> {plate}
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* SINGLE ROW RENTAL PERIOD DETAILS */}
                                                                                <div className="bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] p-2.5 rounded-xl border border-white/10 flex items-center justify-between gap-2 shadow-sm">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                                                                            <CalendarDays size={14} />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[8px] font-black text-gray-400 tracking-widest uppercase">Rental Period</p>
                                                                                            <div className="flex items-center gap-1.5 text-[11px] font-black text-white mt-0.5 truncate">
                                                                                                <span className="text-gray-200">{startDate}</span>
                                                                                                <ArrowRight size={11} className="text-primary shrink-0" />
                                                                                                <span className="text-gray-200">{endDate}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right shrink-0 flex items-center gap-1.5">
                                                                                        <span className="px-2 py-0.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-[10px] font-black tracking-wide">
                                                                                            {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
                                                                                        </span>
                                                                                        <span className="text-[9px] text-gray-400 font-mono hidden sm:inline-block">
                                                                                            (8:00 AM)
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Service Location / Live GPS Pin */}
                                                                                <div 
                                                                                    onClick={() => setViewingMapBooking(booking)}
                                                                                    className="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 hover:border-primary/40 flex items-center gap-2 cursor-pointer transition-all group/loc"
                                                                                    title="Click to view realtime location map"
                                                                                >
                                                                                    <MapPin size={14} className="text-primary shrink-0 group-hover/loc:scale-110 transition-transform" />
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">Pickup & Service Location</p>
                                                                                            <span className="text-[7.5px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded flex items-center gap-1">
                                                                                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> Live GPS Pin
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="text-[10px] font-black text-white mt-0.5 truncate group-hover/loc:text-primary transition-colors" title={booking.pickupLocation || (booking.location as any)?.address}>
                                                                                            {booking.pickupLocation || (booking.location as any)?.address || 'Branch Office HQ'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {activeAdminTab === 'Driver for Hire' && (() => {
                                                                        const assignedDriverObj = (booking as any).driverObj || (db.hireDrivers || []).find(d => d.name === booking.driverName || d.id === (booking as any).driverId);
                                                                        const driverList = db.hireDrivers || [];

                                                                        const currentFields = editingDriverFields[booking.id] || {
                                                                            driverName: booking.driverName || assignedDriverObj?.name || 'Danilo Santos',
                                                                            driverPhone: booking.driverPhone || assignedDriverObj?.phone || '0917-123-4567',
                                                                            estimatedArrivalTime: booking.estimatedArrivalTime || booking.details?.time || '08:00 AM',
                                                                            remarks: booking.remarks || booking.notes || ''
                                                                        };

                                                                        const handleFieldChange = (field: string, val: string) => {
                                                                            setEditingDriverFields(prev => ({
                                                                                ...prev,
                                                                                [booking.id]: {
                                                                                    ...currentFields,
                                                                                    [field]: val
                                                                                }
                                                                            }));
                                                                        };

                                                                        const handleDriverSelect = (driverNameVal: string) => {
                                                                            const found = driverList.find(d => d.name === driverNameVal);
                                                                            setEditingDriverFields(prev => ({
                                                                                ...prev,
                                                                                [booking.id]: {
                                                                                    ...currentFields,
                                                                                    driverName: driverNameVal,
                                                                                    driverPhone: found?.phone || currentFields.driverPhone
                                                                                }
                                                                            }));
                                                                        };

                                                                        const handleSaveDetails = async () => {
                                                                            try {
                                                                                const shouldAdvanceStatus = !booking.status || booking.status === 'Pending' || booking.status === 'Pending Admin Review';
                                                                                const updatedStatus = shouldAdvanceStatus ? 'Driver Assigned' : booking.status;

                                                                                await updateDoc(doc(firestoreDB, 'serviceRequests', booking.id), {
                                                                                    driverName: currentFields.driverName,
                                                                                    driverPhone: currentFields.driverPhone,
                                                                                    estimatedArrivalTime: currentFields.estimatedArrivalTime,
                                                                                    remarks: currentFields.remarks,
                                                                                    status: updatedStatus,
                                                                                    updatedAt: new Date().toISOString()
                                                                                });

                                                                                if (shouldAdvanceStatus && updateServiceRequestStatus) {
                                                                                    await updateServiceRequestStatus(booking.id, 'Driver Assigned', `Driver ${currentFields.driverName} assigned to request.`);
                                                                                }

                                                                                addNotification({ type: 'success', title: 'Driver Assigned', message: `Driver details updated for #${booking.id.slice(-6)}.`, recipientId: 'admin' });
                                                                            } catch (e) {
                                                                                addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
                                                                            }
                                                                        };

                                                                        const activeDriver = driverList.find(d => d.name === currentFields.driverName) || assignedDriverObj;
                                                                        const driverImage = activeDriver?.imageUrl || '';

                                                                        return (
                                                                            <div className="space-y-3 flex-1 flex flex-col justify-between">
                                                                                <div className="space-y-2.5">
                                                                                    {/* Selected & Assigned Driver Card */}
                                                                                    <div className="space-y-2">
                                                                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                                                                                            <span>Selected Driver</span>
                                                                                            {activeDriver?.rating && (
                                                                                                <span className="text-yellow-400 font-bold text-[8px] bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                                                                                                    ⭐ {activeDriver.rating} ({activeDriver.totalTrips || 100}+ trips)
                                                                                                </span>
                                                                                            )}
                                                                                        </h4>
                                                                                        
                                                                                        {/* Driver Profile Preview */}
                                                                                        <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 flex items-center gap-3">
                                                                                            {driverImage ? (
                                                                                                <img
                                                                                                    src={driverImage}
                                                                                                    alt={currentFields.driverName}
                                                                                                    className="w-12 h-12 rounded-xl object-cover border-2 border-primary/30 shrink-0 shadow-md"
                                                                                                />
                                                                                            ) : (
                                                                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-lg font-black text-white shrink-0 shadow-md">
                                                                                                    {currentFields.driverName.charAt(0)}
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-white font-black text-xs leading-tight truncate">{currentFields.driverName}</p>
                                                                                                <p className="text-[9px] text-gray-400 mt-0.5">{activeDriver?.experience || '5+ years experience'} • {activeDriver?.geoLimit || 'Within City'}</p>
                                                                                                {currentFields.driverPhone && (
                                                                                                    <a 
                                                                                                        href={`tel:${currentFields.driverPhone}`}
                                                                                                        className="text-[9px] text-primary font-bold mt-0.5 hover:underline inline-flex items-center gap-1"
                                                                                                    >
                                                                                                        <Phone size={9} /> {currentFields.driverPhone}
                                                                                                    </a>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Driver Selector Dropdown */}
                                                                                        <div className="space-y-1">
                                                                                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Assign / Change Driver</label>
                                                                                            <select 
                                                                                                value={currentFields.driverName}
                                                                                                onChange={e => handleDriverSelect(e.target.value)}
                                                                                                className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none cursor-pointer hover:border-primary/50 transition-colors"
                                                                                            >
                                                                                                {driverList.length > 0 ? (
                                                                                                    driverList.map(d => (
                                                                                                        <option key={d.id} value={d.name} className="bg-[#121212]">{d.name} {d.isAvailable ? '• Available' : '• Assigned'}</option>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    ['Danilo Santos', 'Marlon Dizon', 'Arnel Pineda', 'Cristopher Cruz', 'Generoso Reyes', 'Efren Salonga'].map(name => (
                                                                                                        <option key={name} value={name} className="bg-[#121212]">{name}</option>
                                                                                                    ))
                                                                                                )}
                                                                                            </select>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            {/* ETA */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Est. Arrival Time</label>
                                                                                                <input 
                                                                                                    type="text"
                                                                                                    value={currentFields.estimatedArrivalTime}
                                                                                                    onChange={e => handleFieldChange('estimatedArrivalTime', e.target.value)}
                                                                                                    placeholder="e.g. 08:00 AM"
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none focus:border-primary"
                                                                                                />
                                                                                            </div>
                                                                                            
                                                                                            {/* Remarks */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Driver Remarks</label>
                                                                                                <input 
                                                                                                    type="text"
                                                                                                    value={currentFields.remarks}
                                                                                                    onChange={e => handleFieldChange('remarks', e.target.value)}
                                                                                                    placeholder="Special instructions"
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none focus:border-primary"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <button
                                                                                    onClick={handleSaveDetails}
                                                                                    className="w-full bg-primary hover:bg-[#e06800] text-white font-bold py-2 rounded-lg transition-all text-[10px] mt-2 shadow-lg shadow-primary/20 uppercase tracking-widest"
                                                                                    style={{ backgroundColor: settings?.accentColor }}
                                                                                >
                                                                                    Save Driver Assignment
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {activeAdminTab === 'Towing' && (
                                                                        <>
                                                                            <div className="flex gap-3 items-start">
                                                                                <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                                                                    <Search size={24} />
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-primary font-black text-sm leading-tight truncate">Emergency Towing Request</p>
                                                                                    <p className="text-[10px] text-gray-500 mt-1 leading-normal line-clamp-2">Date: {booking.date} at {formatTimeToAmPm(booking.time)}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="pt-2 border-t border-white/5 space-y-2">
                                                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                                                    <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase">Pickup Location</p>
                                                                                    <p className="text-[10px] font-bold text-gray-300 truncate mt-0.5" title={booking.location ? `${booking.location.latitude}, ${booking.location.longitude}` : 'Current GPS location'}>
                                                                                        {booking.location ? `Latitude: ${booking.location.latitude}, Longitude: ${booking.location.longitude}` : 'Current GPS location'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                                                    <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase">Destination</p>
                                                                                    <p className="text-[10px] font-bold text-gray-300 truncate mt-0.5" title={booking.destination ? `${booking.destination.latitude}, ${booking.destination.longitude}` : 'Not Specified'}>
                                                                                        {booking.destination ? `Latitude: ${booking.destination.latitude}, Longitude: ${booking.destination.longitude}` : 'RidersBUD Main HQ'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                     {activeAdminTab !== 'Liaison' && (
                                                                         <div className="pt-2 border-t border-white/5 space-y-2 mt-auto">
                                                                             <div className="flex items-center justify-between ml-0.5">
                                                                                 <h4 className="text-[9px] font-black tracking-widest text-gray-500 uppercase">Update Status</h4>
                                                                                 <span className="text-[8px] font-mono text-gray-500 font-bold">Instant Sync</span>
                                                                             </div>
                                                                             <div className="flex gap-2 items-center">
                                                                                 {/* Modern Custom Dropdown */}
                                                                                 <div className="flex-1 relative">
                                                                                     {(() => {
                                                                                         let options = ['Pending', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];
                                                                                         if (activeAdminTab === 'Car Rental') {
                                                                                             const isSelfDrive = !(booking as any).includeDriver;
                                                                                             options = isSelfDrive
                                                                                                 ? ['Received', 'Confirmed', 'Ready for Pickup', 'Active Rental', 'Completed', 'Cancelled']
                                                                                                 : ['Received', 'Confirmed', 'Driver Assigned', 'Ready for Pickup', 'Completed', 'Cancelled'];
                                                                                         } else if (activeAdminTab === 'Towing') {
                                                                                             options = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
                                                                                         } else if (activeAdminTab === 'Driver for Hire') {
                                                                                             options = ['Pending', 'Driver Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];
                                                                                         }

                                                                                         const getStatusMeta = (status: string) => {
                                                                                             switch (status) {
                                                                                                 case 'Pending':
                                                                                                 case 'Received':
                                                                                                     return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
                                                                                                 case 'Confirmed':
                                                                                                  case 'Approved':
                                                                                                      return { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };
                                                                                                  case 'Driver Assigned':
                                                                                                  case 'Mechanic Assigned':
                                                                                                      return { icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
                                                                                                  case 'Ready for Pickup':
                                                                                                      return { icon: KeyRound, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
                                                                                                  case 'Active Rental':
                                                                                                      return { icon: Car, color: 'text-[#FF7903]', bg: 'bg-[#FF7903]/10', border: 'border-[#FF7903]/30' };
                                                                                                 case 'En Route':
                                                                                                     return { icon: Navigation, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' };
                                                                                                 case 'In Progress':
                                                                                                     return { icon: Wrench, color: 'text-[#FF7903]', bg: 'bg-[#FF7903]/10', border: 'border-[#FF7903]/30' };
                                                                                                 case 'Completed':
                                                                                                     return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
                                                                                                 case 'Cancelled':
                                                                                                     return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' };
                                                                                                 default:
                                                                                                     return { icon: Sparkles, color: 'text-gray-300', bg: 'bg-white/10', border: 'border-white/10' };
                                                                                             }
                                                                                         };

                                                                                         const currentMeta = getStatusMeta(booking.status);
                                                                                         const CurrentIcon = currentMeta.icon;
                                                                                         const isOpen = openStatusDropdownId === booking.id;

                                                                                         return (
                                                                                             <div className="relative">
                                                                                                 <button
                                                                                                     type="button"
                                                                                                     onClick={(e) => {
                                                                                                         e.stopPropagation();
                                                                                                         setOpenStatusDropdownId(isOpen ? null : booking.id);
                                                                                                     }}
                                                                                                     className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all duration-200 border ${currentMeta.bg} ${currentMeta.border} hover:border-[#FF7903]/60 shadow-sm active:scale-[0.99]`}
                                                                                                 >
                                                                                                     <div className="flex items-center gap-2 min-w-0">
                                                                                                         <CurrentIcon size={13} className={`${currentMeta.color} shrink-0 animate-pulse`} />
                                                                                                         <span className="text-white truncate font-black">{booking.status}</span>
                                                                                                     </div>
                                                                                                     <ChevronDown
                                                                                                         size={13}
                                                                                                         className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                                                                                                     />
                                                                                                 </button>

                                                                                                 {/* Smooth Popover Menu */}
                                                                                                 {isOpen && (
                                                                                                     <div
                                                                                                         onClick={(e) => e.stopPropagation()}
                                                                                                         className="absolute z-50 bottom-full mb-1.5 left-0 right-0 bg-[#161616] border border-white/15 rounded-xl shadow-2xl p-1.5 backdrop-blur-xl animate-fadeIn space-y-1"
                                                                                                     >
                                                                                                         <div className="px-2 py-1 text-[8px] font-black tracking-widest text-gray-400 uppercase border-b border-white/5 flex items-center justify-between">
                                                                                                             <span>Select New Status</span>
                                                                                                             <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                                                         </div>
                                                                                                         <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                                                                                                             {options.map((opt) => {
                                                                                                                 const optMeta = getStatusMeta(opt);
                                                                                                                 const OptIcon = optMeta.icon;
                                                                                                                 const isSelected = booking.status === opt;

                                                                                                                 return (
                                                                                                                     <button
                                                                                                                         key={opt}
                                                                                                                         type="button"
                                                                                                                         onClick={(e) => {
                                                                                                                             e.stopPropagation();
                                                                                                                             setOpenStatusDropdownId(null);
                                                                                                                             handleStatusChange(booking, opt);
                                                                                                                         }}
                                                                                                                         className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all group/item text-left ${
                                                                                                                             isSelected
                                                                                                                                 ? `${optMeta.bg} text-white border ${optMeta.border}`
                                                                                                                                 : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                                                                                                                         }`}
                                                                                                                     >
                                                                                                                         <div className="flex items-center gap-2 min-w-0">
                                                                                                                             <div className={`p-1 rounded-md ${optMeta.bg} ${optMeta.color} shrink-0`}>
                                                                                                                                 <OptIcon size={12} />
                                                                                                                             </div>
                                                                                                                             <span className="truncate">{opt}</span>
                                                                                                                         </div>
                                                                                                                         {isSelected && (
                                                                                                                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                                                                                                                         )}
                                                                                                                     </button>
                                                                                                                 );
                                                                                                             })}
                                                                                                         </div>
                                                                                                     </div>
                                                                                                 )}
                                                                                             </div>
                                                                                         );
                                                                                     })()}
                                                                                 </div>

                                                                                 {booking.status !== 'Cancelled' && (
                                                                                     <Tooltip content="Cancel this booking">
                                                                                         <button
                                                                                             onClick={(e) => { e.stopPropagation(); setCancellingBooking(booking); }}
                                                                                             className="px-3.5 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 font-black tracking-widest text-[9px] shrink-0 active:scale-95"
                                                                                         >
                                                                                             Cancel
                                                                                         </button>
                                                                                     </Tooltip>
                                                                                 )}
                                                                             </div>
                                                                         </div>
                                                                     )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* TIMELINE / DOCUMENTS CARD — conditional by tab */}
                                                        {activeAdminTab === 'Liaison' ? (
                                                            /* Uploaded Documents Panel for Liaison tab */
                                                            <div className="flex flex-col">
                                                                <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all flex flex-col">
                                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                                            <ExternalLink size={14} />
                                                                        </div>
                                                                        Uploaded Documents
                                                                        <span className="ml-auto bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black px-2 py-0.5 rounded-full">
                                                                            {((booking as any).documents?.length || 0)}
                                                                        </span>
                                                                    </h4>
                                                                    <div className="flex-1 space-y-2 pr-0.5">
                                                                        {(() => {
                                                                            const docs: { name: string; url: string; type?: string; size?: number }[] = ((booking as any).documents || []);
                                                                            if (docs.length === 0) {
                                                                                return (
                                                                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                                                                                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                                                            <ExternalLink size={18} className="text-gray-700" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-[11px] font-black text-gray-500 tracking-wider">No Documents Uploaded</p>
                                                                                            <p className="text-[9px] text-gray-700 mt-1">Customer has not uploaded any documents yet.</p>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return docs.map((doc, idx) => {
                                                                                const isImage = doc.url && (
                                                                                    doc.url.startsWith('data:image') || 
                                                                                    doc.type?.startsWith('image/') || 
                                                                                    /\.(jpg|jpeg|png|gif|webp|svg)/i.test(doc.url) || 
                                                                                    /\.(jpg|jpeg|png|gif|webp|svg)/i.test(doc.name || '')
                                                                                );
                                                                                const isPdf = doc.type?.includes('pdf') || /\.pdf/i.test(doc.url || '') || /\.pdf/i.test(doc.name || '');
                                                                                const ext = isPdf ? 'PDF' : isImage ? 'IMG' : 'FILE';
                                                                                const extColor = isPdf ? 'text-red-400 bg-red-500/10 border-red-500/20' : isImage ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                                                                                
                                                                                const handlePreview = (e: React.MouseEvent) => {
                                                                                    e.stopPropagation();
                                                                                    setPreviewDocName(doc.name);
                                                                                    setPreviewImageUrl(doc.url);
                                                                                };

                                                                                return (
                                                                                    <div key={idx} className="group/doc bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/20 rounded-lg p-1.5 transition-all">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {/* Icon / Thumbnail */}
                                                                                            <div className="shrink-0">
                                                                                                {isImage && doc.url ? (
                                                                                                    <div
                                                                                                        className="w-8 h-8 rounded overflow-hidden border border-white/10 cursor-pointer hover:border-blue-400/50 transition-colors"
                                                                                                        onClick={handlePreview}
                                                                                                    >
                                                                                                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div 
                                                                                                        className={`w-8 h-8 rounded flex flex-col items-center justify-center border text-[7px] font-black tracking-wider cursor-pointer ${extColor}`}
                                                                                                        onClick={handlePreview}
                                                                                                    >
                                                                                                        <ExternalLink size={10} />
                                                                                                        <span className="mt-0.5">{ext}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            {/* Info */}
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-[9.5px] font-black text-white truncate leading-tight">{doc.name}</p>
                                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                                    {doc.size && <span className="text-[8px] text-gray-600 font-medium">{(doc.size / 1024).toFixed(1)} KB</span>}
                                                                                                    {doc.type && <span className="text-[8px] text-gray-650 truncate max-w-[80px]">{doc.type.split('/')[1] || doc.type}</span>}
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* Actions */}
                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                <Tooltip content="Preview document">
                                                                                                    <button
                                                                                                        onClick={handlePreview}
                                                                                                        className="p-1 rounded bg-white/5 hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 border border-white/5 hover:border-blue-500/20 transition-all"
                                                                                                    >
                                                                                                        <Eye size={10} />
                                                                                                    </button>
                                                                                                </Tooltip>
                                                                                                {doc.url && (
                                                                                                    <Tooltip content="Open document link">
                                                                                                        <a
                                                                                                            href={doc.url}
                                                                                                            target="_blank"
                                                                                                            rel="noopener noreferrer"
                                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                                            className="p-1 rounded bg-white/5 hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 border border-white/5 hover:border-blue-500/20 transition-all"
                                                                                                        >
                                                                                                            <ExternalLink size={10} />
                                                                                                        </a>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* Progress Tracking Timeline for all other tabs */
                                                            <div className="flex flex-col h-full">
                                                                <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all h-full overflow-hidden flex flex-col">
                                                                    {/* Header */}
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 uppercase flex items-center gap-2 font-mono">
                                                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                                <Clock size={14} />
                                                                            </div>
                                                                            Progress Tracking
                                                                        </h4>
                                                                        {booking.status && (
                                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                                                                                booking.status === 'Completed'
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                                    : booking.status === 'Cancelled'
                                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                                    : 'bg-primary/10 text-primary border-primary/20 animate-pulse'
                                                                            }`}>
                                                                                {booking.status === 'Completed' ? 'Finished' : 'Live'}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Driver for Hire: Trip Details Overview placed before Progress Tracking rail */}
                                                                    {activeAdminTab === 'Driver for Hire' && (
                                                                        <div className="mb-3 p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 text-[10px]">
                                                                            <div className="flex items-start gap-2">
                                                                                <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px] shrink-0 mt-0.5">Route:</span> 
                                                                                <span className="text-white font-black truncate">{booking.details?.pickupLocation || booking.location?.address || 'Pickup Point'} ➔ {booking.details?.destination || 'Destination'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Purpose of Hire:</span>{' '}
                                                                                <span className="text-amber-400 font-black">{booking.purposeOfHire || booking.details?.purposeOfHire || 'Personal Travel / Errands'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Vehicle Option:</span>{' '}
                                                                                {booking.vehicleDetails ? (
                                                                                    <span className="text-emerald-400 font-black">Drive Customer's Car</span>
                                                                                ) : (
                                                                                    <span className="text-blue-400 font-black">Driver Provides Vehicle</span>
                                                                                )}
                                                                            </div>
                                                                            {booking.vehicleDetails && (
                                                                                <div className="mt-1 pl-2 border-l border-primary/40 space-y-0.5 text-gray-300">
                                                                                    <div><span className="text-gray-500 font-medium">Brand & Model:</span> {booking.vehicleDetails.brand} {booking.vehicleDetails.model}</div>
                                                                                    <div><span className="text-gray-500 font-medium">Plate Number:</span> <span className="font-mono bg-white/5 px-1 rounded text-white">{booking.vehicleDetails.plateNumber}</span></div>
                                                                                    <div><span className="text-gray-500 font-medium">Type:</span> {booking.vehicleDetails.type || 'Sedan'}</div>
                                                                                </div>
                                                                            )}
                                                                            {!booking.vehicleDetails && (
                                                                                <div className="mt-1 pl-2 border-l border-blue-500/40 text-gray-300">
                                                                                    <div><span className="text-gray-500 font-medium">Requested Type:</span> {booking.details?.vehicleType || 'Sedan'}</div>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between items-center pt-0.5">
                                                                                <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Duration:</span> <span className="text-white font-medium">{booking.details?.duration || '8 Hours (Full Day)'}</span></div>
                                                                                <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Time:</span> <span className="text-primary font-bold">{booking.details?.time || booking.time || '08:00 AM'}</span></div>
                                                                            </div>
                                                                            {booking.notes && (
                                                                                <div className="pt-0.5"><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Customer Notes:</span> <span className="text-gray-400 italic">"{booking.notes}"</span></div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Vertical Timeline Rail */}
                                                                    <div className="flex-1 overflow-y-auto pr-0.5">
                                                                        {(() => {
                                                                            const timelineData = getTimelineData(booking.status, booking.statusHistory);
                                                                            if (timelineData.length === 0) {
                                                                                return (
                                                                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-6">
                                                                                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                                                            <Clock size={16} className="text-gray-600" />
                                                                                        </div>
                                                                                        <p className="text-[10px] text-gray-500 font-bold tracking-wider">No timeline history recorded.</p>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div className="space-y-2 relative pl-0.5">
                                                                                    {timelineData.map((s, i) => {
                                                                                        const isLast = i === timelineData.length - 1;
                                                                                        const isCompleted = booking.status === 'Completed';
                                                                                        const isCurrent = isLast && !isCompleted;

                                                                                        return (
                                                                                            <div key={i} className="flex items-start gap-2.5 relative group">
                                                                                                {/* Connecting Vertical Track */}
                                                                                                {!isLast && (
                                                                                                    <div 
                                                                                                        className="absolute left-[11px] top-[22px] w-[2px] bg-gradient-to-b from-primary/80 via-primary/30 to-white/10 pointer-events-none"
                                                                                                        style={{ height: 'calc(100% + 2px)' }}
                                                                                                    />
                                                                                                )}

                                                                                                {/* Node Indicator */}
                                                                                                <div className="relative z-10 shrink-0 mt-0.5">
                                                                                                    {isCompleted ? (
                                                                                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 border border-emerald-400/30">
                                                                                                            <CheckCircle size={12} className="stroke-[2.5]" />
                                                                                                        </div>
                                                                                                    ) : isCurrent ? (
                                                                                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-orange-600 text-white flex items-center justify-center shadow-md shadow-primary/30 ring-2 ring-primary/20 border border-orange-400/40">
                                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <div className="w-6 h-6 rounded-lg bg-[#1e1e22] text-gray-400 flex items-center justify-center border border-white/10 text-[10px] font-black font-mono shadow-inner group-hover:border-white/20 transition-colors">
                                                                                                            {i + 1}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                {/* Step Content Card */}
                                                                                                <div className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border transition-all ${
                                                                                                    isCurrent
                                                                                                        ? 'bg-primary/[0.07] border-primary/25 shadow-sm shadow-primary/5'
                                                                                                        : isCompleted && isLast
                                                                                                        ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                                                                                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                                                                                }`}>
                                                                                                    <div className="flex items-center justify-between gap-1.5">
                                                                                                        <p className={`text-xs font-black tracking-tight truncate ${
                                                                                                            isCurrent
                                                                                                                ? 'text-primary drop-shadow-[0_0_6px_rgba(255,121,3,0.3)]'
                                                                                                                : isCompleted && isLast
                                                                                                                ? 'text-emerald-400'
                                                                                                                : 'text-white'
                                                                                                        }`}>
                                                                                                            {s.status}
                                                                                                        </p>
                                                                                                        {isCurrent && (
                                                                                                            <span className="text-[7.5px] font-black uppercase px-1 py-0.2 bg-primary/20 text-primary border border-primary/30 rounded tracking-wider shrink-0">
                                                                                                                Active
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {isCompleted && isLast && (
                                                                                                            <span className="text-[7.5px] font-black uppercase px-1 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded tracking-wider shrink-0">
                                                                                                                Finished
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                                                        <Clock size={9} className={isCurrent ? 'text-primary/70' : 'text-gray-500'} />
                                                                                                        <p className={`text-[9.5px] font-mono font-bold tracking-wide ${
                                                                                                            isCurrent ? 'text-primary/90' : 'text-gray-400'
                                                                                                        }`}>
                                                                                                            {new Date(s.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                                                        </p>
                                                                                                        <span className="text-[8px] text-gray-600 font-mono">•</span>
                                                                                                        <span className="text-[8.5px] text-gray-500 font-mono">
                                                                                                            {new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* LIVE MAP OR ADDRESS/PICKUP DETAILS CARD */}
                                                        {activeAdminTab === 'Liaison' ? (
                                                            /* Address Details and Pickup Details for Liaison tab */
                                                            <div className="flex flex-col h-full">
                                                                <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all h-full flex flex-col justify-between gap-4">
                                                                    <div>
                                                                        <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
                                                                            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                                                <MapPin size={14} />
                                                                            </div>
                                                                            Address & Pickup Details
                                                                        </h4>

                                                                        <div className="space-y-4">
                                                                            {/* Pickup Option interactive button & Live Map Modal trigger */}
                                                                            <div 
                                                                                onClick={() => setViewingMapBooking(booking)}
                                                                                className="bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-primary/50 p-3.5 cursor-pointer transition-all duration-200 group/loc shadow-lg relative overflow-hidden"
                                                                                title="Click to view real-time location map & route"
                                                                            >
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/loc:scale-105 group-hover/loc:bg-primary group-hover/loc:text-black transition-all shrink-0">
                                                                                            <MapPin size={18} />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase">Pickup Option</p>
                                                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold shrink-0">
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                                                                    Live GPS
                                                                                                </span>
                                                                                            </div>
                                                                                            <p className="text-xs font-black text-white group-hover/loc:text-primary transition-colors mt-0.5 truncate">
                                                                                                {(booking as any).pickupOption || 'Customer brings documents to branch'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button 
                                                                                        type="button"
                                                                                        className="px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-black border border-primary/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                                                                    >
                                                                                        <Navigation size={12} />
                                                                                        <span>View Map</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Embedded Live Map Card preview */}
                                                                            <div 
                                                                                onClick={() => setViewingMapBooking(booking)}
                                                                                className="h-32 rounded-xl overflow-hidden relative border border-white/10 cursor-pointer group/minimap hover:border-primary/50 transition-all"
                                                                                title="Click to expand real-time live map & route"
                                                                            >
                                                                                <LiveMapCard booking={booking} />
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5 z-10 pointer-events-none">
                                                                                    <span className="px-2 py-1 rounded bg-black/85 backdrop-blur-md border border-white/20 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                                                                                        <Maximize2 size={11} className="text-primary" /> Live Client & HQ Route
                                                                                    </span>
                                                                                    <span className="text-[9px] font-bold text-gray-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                                                                                        Tap to Expand
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Pickup Address card */}
                                                                            <div className="bg-white/5 rounded-xl border border-white/5 p-3">
                                                                                <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase mb-1">Pickup Address</p>
                                                                                <p className="text-xs font-bold text-gray-300 leading-relaxed">
                                                                                    {(booking as any).pickupAddress || ((booking as any).pickupOption === 'Customer brings documents' ? 'Not applicable (Documents will be delivered directly by customer to LTO Branch)' : 'No pickup address specified.')}
                                                                                </p>
                                                                            </div>

                                                                            {/* Itemized LTO Transaction Fees & Payment Status Card */}
                                                                            {(() => {
                                                                                const fees = (booking as any).fees || {};
                                                                                const total = fees.total || booking.totalAmount || 1500;
                                                                                const serviceFee = fees.serviceFee || total;
                                                                                const govtFee = fees.governmentFee || 0;
                                                                                const pickupFee = fees.pickupFee || 0;
                                                                                const dpAmount = (booking as any).downpaymentAmount || Math.round(total * 0.5);
                                                                                const isPaid = booking.paymentStatus === 'Paid' || booking.status === 'Completed';
                                                                                const isDpPaid = booking.paymentStatus === 'Downpayment Paid';
                                                                                const paidAmount = isPaid ? total : (isDpPaid ? dpAmount : ((booking as any).paidAmount || 0));
                                                                                const remainingBalance = Math.max(0, total - paidAmount);

                                                                                return (
                                                                                    <div className="bg-white/5 rounded-xl border border-white/5 p-3 space-y-2">
                                                                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                                                            <span className="text-[8px] font-black text-gray-500 tracking-wider uppercase">LTO Fee Structure</span>
                                                                                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${
                                                                                                isPaid 
                                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                                                    : isDpPaid 
                                                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                                            }`}>
                                                                                                {booking.paymentStatus || 'Pending Payment'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="space-y-1 text-[10px]">
                                                                                            <div className="flex justify-between text-gray-400">
                                                                                                <span>Liaison Assistance:</span>
                                                                                                <span className="font-mono text-gray-200">₱{serviceFee.toLocaleString()}</span>
                                                                                            </div>
                                                                                            {govtFee > 0 && (
                                                                                                <div className="flex justify-between text-gray-400">
                                                                                                    <span>LTO Government Fee:</span>
                                                                                                    <span className="font-mono text-gray-200">₱{govtFee.toLocaleString()}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {pickupFee > 0 && (
                                                                                                <div className="flex justify-between text-gray-400">
                                                                                                    <span>Door Pickup Fee:</span>
                                                                                                    <span className="font-mono text-gray-200">₱{pickupFee.toLocaleString()}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex justify-between text-white font-black pt-1 border-t border-white/5">
                                                                                                <span>Total Order:</span>
                                                                                                <span className="font-mono text-primary font-black">₱{total.toLocaleString()}</span>
                                                                                            </div>
                                                                                            {remainingBalance > 0 && (
                                                                                                <div className="flex justify-between text-amber-400 font-bold">
                                                                                                    <span>Remaining Balance:</span>
                                                                                                    <span className="font-mono">₱{remainingBalance.toLocaleString()}</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            {/* Designated LTO Branch card */}
                                                                            <div className="bg-white/5 rounded-xl border border-white/5 p-3">
                                                                                <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase mb-1">Designated LTO Branch</p>
                                                                                <p className="text-xs font-black text-primary leading-relaxed">
                                                                                    {booking.branchName || 'Any Available LTO Office'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Update Status for Liaison (Moved here) */}
                                                                    <div className="pt-2 border-t border-white/5 space-y-2 mt-auto">
                                                                        <h4 className="text-[9px] font-black tracking-widest text-gray-600 ml-1">Update Status</h4>
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-1 relative group/select">
                                                                                <select id={`booking-status-liaison-${booking.id}`} name={`booking-status-liaison-${booking.id}`}
                                                                                    value={booking.status}
                                                                                    onChange={(e) => handleStatusChange(booking, e.target.value)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    className="w-full bg-white/5 border border-white/10 py-2 px-3 rounded-lg text-[10px] font-black tracking-widest text-white hover:border-primary transition-all outline-none appearance-none cursor-pointer"
                                                                                >
                                                                                    <option value="Pending Admin Review" className="bg-[#121212]">Pending Admin Review</option>
                                                                                    <option value="For Verification" className="bg-[#121212]">For Verification</option>
                                                                                    <option value="For Processing" className="bg-[#121212]">For Processing</option>
                                                                                    <option value="Assigned" className="bg-[#121212]">Assigned</option>
                                                                                    <option value="In Progress" className="bg-[#121212]">In Progress</option>
                                                                                    <option value="Booking Received" className="bg-[#121212]">Booking Received</option>
                                                                                    <option value="Processing at LTO" className="bg-[#121212]">Processing at LTO</option>
                                                                                    <option value="Completed" className="bg-[#121212]">Completed</option>
                                                                                    <option value="Cancelled" className="bg-[#121212]">Cancelled</option>
                                                                                </select>
                                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover/select:text-primary transition-colors" size={14} />
                                                                            </div>
                                                                            {booking.status !== 'Cancelled' && (
                                                                                <Tooltip content="Cancel this booking">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setCancellingBooking(booking); }}
                                                                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20 font-black tracking-widest text-[9px]"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </Tooltip>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* LIVE MAP CARD for all other tabs */
                                                            <div className="flex flex-col h-full">
                                                                <div 
                                                                    onClick={() => setViewingMapBooking(booking)}
                                                                    className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/50 hover:shadow-primary/10 transition-all h-full overflow-hidden flex flex-col cursor-pointer group/mapcard relative"
                                                                    title="Click to expand real-time live map and transaction details"
                                                                >
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 flex items-center gap-2 group-hover/mapcard:text-white transition-colors">
                                                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/mapcard:scale-110 group-hover/mapcard:bg-primary group-hover/mapcard:text-black transition-all">
                                                                                <Navigation size={13} />
                                                                            </div>
                                                                            Real-time Location
                                                                        </h4>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                                                Live
                                                                            </span>
                                                                            <span className="p-1 rounded-lg bg-white/5 group-hover/mapcard:bg-primary group-hover/mapcard:text-black text-gray-400 transition-all">
                                                                                <Maximize2 size={12} />
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-h-[160px] relative pointer-events-none rounded-xl overflow-hidden border border-white/5">
                                                                        <LiveMapCard booking={booking} />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/mapcard:opacity-100 transition-opacity flex items-end justify-center p-2.5 z-10 pointer-events-none">
                                                                            <span className="px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
                                                                                <Maximize2 size={11} className="text-primary" /> Click to View Live Details
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-admin-border rounded-full flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-admin-text-secondary" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold text-admin-text-primary mb-1">No bookings found</p>
                                                <p className="text-sm text-admin-text-secondary">Try adjusting your filters or search query</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile / Tablet Responsive View */}
                <div className="block md:hidden space-y-4">
                    {sortedAndFilteredBookings.length > 0 ? (
                        sortedAndFilteredBookings.map((booking) => {
                            const isExpanded = expandedBookingId === booking.id;
                            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                            const names = svcs.map(s => s.name).join(', ') || 'Unknown Service';
                            const originalServicesFee = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0) || (Number(booking.totalAmount) || 0);
                            const addCosts = (booking.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
                            const total = originalServicesFee + addCosts;

                            return (
                                <div
                                    key={booking.id}
                                    className={`bg-[#121212]/80 backdrop-blur-2xl border border-white/10 rounded-xl p-3.5 shadow-2xl transition-all duration-300 ${
                                        isExpanded ? 'ring-2 ring-primary/40' : ''
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5" onClick={() => toggleRow(booking.id)}>
                                        <div className="flex items-center gap-2">
                                            <Tooltip content={isExpanded ? 'Collapse details' : 'Expand details'}>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-gray-500'}`} />
                                            </Tooltip>
                                            <span className="text-[10px] font-black tracking-widest text-gray-500">{bookingSequences[booking.id] || booking.id}</span>
                                            {(((booking.createdAt && (new Date().getTime() - new Date(booking.createdAt).getTime()) < 24 * 60 * 60 * 1000) || 
                                              (!booking.createdAt && booking.date === new Date().toISOString().split('T')[0])) && 
                                              booking.status !== 'Completed' && booking.status !== 'Cancelled') && (
                                                <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse shrink-0">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest border ${statusColors[booking.status]}`}>
                                            {booking.status}
                                        </span>
                                    </div>

                                    {/* Card Body */}
                                    <div className="py-2.5 space-y-2 cursor-pointer" onClick={() => toggleRow(booking.id)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Customer</p>
                                                <p className="font-black text-white text-sm mt-0.5">{booking.customerName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Price</p>
                                                <p className="font-black text-green-400 text-sm mt-0.5">{total > 0 ? `₱${total.toLocaleString()}` : 'For Quotation'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Service</p>
                                            <p className="font-bold text-gray-300 text-xs mt-0.5">{names}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Date & Time</p>
                                                <p className="font-bold text-white text-xs mt-0.5">{booking.date}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{booking.time}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Payment</p>
                                                <div className="mt-1">
                                                    {(() => {
                                                        const isGcash = booking.paymentMethod === 'GCash';
                                                        const hasReceipt = !!booking.gcashReceiptUrl;
                                                        const isVerified = booking.isVerified;
                                                        const isDeclined = !!booking.gcashDeclineReason;

                                                        if (booking.isPaid) {
                                                            return <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[9px] font-black tracking-widest border border-green-500/20">Fully Paid</span>;
                                                        }
                                                        if (isGcash) {
                                                            if (isVerified) return <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[9px] font-black tracking-widest border border-green-500/20">Deposit Confirmed</span>;
                                                            if (isDeclined) return <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-black tracking-widest border border-red-500/20">Deposit Declined</span>;
                                                            if (hasReceipt) return <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-[9px] font-black tracking-widest border border-orange-500/20 animate-pulse">Pending Review</span>;
                                                            return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-[9px] font-black tracking-widest border border-yellow-500/20">Unpaid (GCash)</span>;
                                                        }
                                                        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-[9px] font-black tracking-widest border border-yellow-500/20">Unpaid</span>;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Expanded Details */}
                                    {isExpanded && (
                                        <div className="pt-3 mt-1.5 border-t border-white/5 space-y-4 animate-fadeIn">
                                            {/* CUSTOMER & VEHICLE CARD */}
                                            <div className="bg-[#151515] p-3.5 rounded-xl border border-white/10 shadow-2xl">
                                                <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                    <Users size={14} className="text-primary" />
                                                    Customer & Vehicle
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-base font-black text-white">
                                                            {booking.customerName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-black text-xs">{booking.customerName}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold">{db.customers.find(c => c.name === booking.customerName)?.phone || 'No phone'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-1.5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500 font-bold">Vehicle</span>
                                                            <span className="text-white font-black">{booking.vehicle?.year || ''} {booking.vehicle?.make || ''}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500 font-bold">Model</span>
                                                            <span className="text-white font-black">{booking.vehicle?.model || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 font-bold text-[10px]">Plate Num</span>
                                                            <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-md font-mono text-[10px] font-black border border-primary/20">{booking.vehicle?.plateNumber || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Quick Action Buttons / Payment Updates */}
                                                    <div className="flex flex-col gap-2 pt-1">
                                                        {!booking.isPaid && booking.paymentMethod !== 'GCash' && (
                                                            <Tooltip content="Mark booking as fully paid">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleMarkPaid(booking.id); }}
                                                                    className="w-full py-2 bg-green-500 hover:bg-green-600 text-white font-black tracking-widest text-[9px] rounded-lg transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <DollarSign size={12} /> Mark Fully Paid
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        {booking.paymentMethod === 'GCash' && (booking.gcashDownpaymentReference || booking.gcashReference || booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl) && !booking.isVerified && (
                                                            <div className="p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/20 space-y-2">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-blue-400 font-bold">GCash Ref:</span>
                                                                    <span className="text-white font-mono font-black">{booking.gcashDownpaymentReference || booking.gcashReference || 'Pending'}</span>
                                                                </div>
                                                                {(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl) && (
                                                                    <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                                        <img 
                                                                            src={booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl} 
                                                                            alt="Receipt" 
                                                                            className="w-full h-auto max-h-32 object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <Tooltip content="Confirm GCash downpayment">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); verifyBookingPayment(booking.id); }}
                                                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black tracking-widest text-[9px] rounded-lg transition-all"
                                                                    >
                                                                        Confirm Downpayment
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SERVICE MANAGEMENT CARD */}
                                            <div className="bg-[#151515] p-3.5 rounded-xl border border-white/10 shadow-2xl">
                                                <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                    <Edit size={14} className="text-primary" />
                                                    Service & Management
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <img 
                                                            src={booking.service?.imageUrl || getFallbackImageForCategory(booking.service?.category)} 
                                                            alt={booking.service?.name || 'Service'} 
                                                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(booking.service?.category); }}
                                                        />
                                                        <div>
                                                            <p className="text-primary font-black text-sm">{booking.service?.name || 'Unknown Service'}</p>
                                                            <p className="text-[10px] text-gray-500 mt-1">{booking.service?.estimatedTime || 'N/A'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-1.5">
                                                        {booking.mechanic ? (
                                                            <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                                                                        {booking.mechanic.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-white text-xs">{booking.mechanic.name}</p>
                                                                        <p className="text-[8px] text-gray-500 font-bold">Assigned</p>
                                                                    </div>
                                                                </div>
                                                                <Tooltip content="Reassign mechanic">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                        className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded transition-all"
                                                                    >
                                                                        <Edit size={10} />
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        ) : (
                                                            <Tooltip content="Assign a mechanic to this booking">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                    className="w-full py-2 bg-primary text-white font-black tracking-widest text-[9px] rounded-lg transition-all"
                                                                >
                                                                    Assign Mechanic
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                    </div>

                                                    {/* Status Controls */}
                                                    <div className="flex gap-2 pt-1.5">
                                                        <div className="flex-1 relative">
                                                            <select id={`booking-status-${booking.id}`} name={`booking-status-${booking.id}`}
                                                                value={booking.status}
                                                                onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-full bg-white/5 border border-white/10 py-2 px-3 rounded-lg text-[10px] font-black text-white appearance-none outline-none"
                                                            >
                                                                {bookingStatuses.slice(1).map(s => <option key={s} value={s} className="bg-[#121212]">{s}</option>)}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                                                        </div>
                                                        {booking.status !== 'Cancelled' && (
                                                            <Tooltip content="Cancel this booking">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setCancellingBooking(booking); }}
                                                                    className="px-4 bg-red-500/10 text-red-500 rounded-lg font-black text-[10px] border border-red-500/20"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DRIVER FOR HIRE: TRIP DETAILS (MOBILE) */}
                                            {activeAdminTab === 'Driver for Hire' && (
                                                <div className="bg-[#151515] p-3.5 rounded-xl border border-white/10 shadow-2xl space-y-1.5 text-[10px]">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-2 flex items-center gap-2">
                                                        <Navigation size={14} className="text-primary" />
                                                        Trip Details
                                                    </h4>
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px] shrink-0 mt-0.5">Route:</span> 
                                                        <span className="text-white font-black truncate">{booking.details?.pickupLocation || booking.location?.address || 'Pickup Point'} ➔ {booking.details?.destination || 'Destination'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Purpose of Hire:</span>{' '}
                                                        <span className="text-amber-400 font-black">{booking.purposeOfHire || booking.details?.purposeOfHire || 'Personal Travel / Errands'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Vehicle Option:</span>{' '}
                                                        {booking.vehicleDetails ? (
                                                            <span className="text-emerald-400 font-black">Drive Customer's Car</span>
                                                        ) : (
                                                            <span className="text-blue-400 font-black">Driver Provides Vehicle</span>
                                                        )}
                                                    </div>
                                                    {booking.vehicleDetails && (
                                                        <div className="mt-1 pl-2 border-l border-primary/40 space-y-0.5 text-gray-300">
                                                            <div><span className="text-gray-500 font-medium">Brand & Model:</span> {booking.vehicleDetails.brand} {booking.vehicleDetails.model}</div>
                                                            <div><span className="text-gray-500 font-medium">Plate Number:</span> <span className="font-mono bg-white/5 px-1 rounded text-white">{booking.vehicleDetails.plateNumber}</span></div>
                                                            <div><span className="text-gray-500 font-medium">Type:</span> {booking.vehicleDetails.type || 'Sedan'}</div>
                                                        </div>
                                                    )}
                                                    {!booking.vehicleDetails && (
                                                        <div className="mt-1 pl-2 border-l border-blue-500/40 text-gray-300">
                                                            <div><span className="text-gray-500 font-medium">Requested Type:</span> {booking.details?.vehicleType || 'Sedan'}</div>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pt-0.5">
                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Duration:</span> <span className="text-white font-medium">{booking.details?.duration || '8 Hours (Full Day)'}</span></div>
                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Time:</span> <span className="text-primary font-bold">{booking.details?.time || booking.time || '08:00 AM'}</span></div>
                                                    </div>
                                                    {booking.notes && (
                                                        <div className="pt-0.5"><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Customer Notes:</span> <span className="text-gray-400 italic">"{booking.notes}"</span></div>
                                                    )}
                                                </div>
                                            )}

                                            {/* TIMELINE PROGRESS CARD */}
                                            <div className="bg-[#151515] p-3.5 rounded-xl border border-white/10 shadow-2xl">
                                                <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                    <Clock size={14} className="text-primary" />
                                                    Progress Timeline
                                                </h4>
                                                <div className="space-y-2.5 relative pl-3">
                                                    <div className="absolute left-[19px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-primary/50 to-transparent"></div>
                                                    {(() => {
                                                        const timelineData = getTimelineData(booking.status, booking.statusHistory);
                                                        return timelineData.length > 0 ? (
                                                            timelineData.map((s, i) => (
                                                                <div key={i} className="flex gap-3 relative">
                                                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black z-10 ${i === timelineData.length - 1 ? 'bg-primary text-white' : 'bg-white/5 text-gray-500'}`}>
                                                                        {i + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-xs font-black ${i === timelineData.length - 1 ? 'text-white' : 'text-gray-500'}`}>{s.status}</p>
                                                                        <p className="text-[8px] text-gray-600 font-bold mt-0.5">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-[10px] text-gray-600 font-bold pl-2 py-2">No history recorded yet.</p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* MOBILE REAL-TIME LOCATION CARD */}
                                            <div 
                                                onClick={() => setViewingMapBooking(booking)}
                                                className="bg-[#151515] p-3.5 rounded-xl border border-white/10 shadow-2xl hover:border-primary/50 transition-all cursor-pointer group/mobilemap relative overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-gray-500 flex items-center gap-2 group-hover/mobilemap:text-white transition-colors">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                            <Navigation size={12} />
                                                        </div>
                                                        Real-time Location
                                                    </h4>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                            Live
                                                        </span>
                                                        <span className="p-1 rounded-md bg-white/5 text-primary">
                                                            <Maximize2 size={11} />
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-36 rounded-lg overflow-hidden relative border border-white/5 pointer-events-none">
                                                    <LiveMapCard booking={booking} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-2 z-10">
                                                        <span className="px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                                                            <Maximize2 size={10} className="text-primary" /> Tap to Open Live Tracking
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 bg-[#121212]/60 rounded-3xl border border-white/10">
                            <p className="text-gray-500 font-bold text-xs">No bookings found</p>
                        </div>
                    )}
                </div>
            </div>
            {assigningBooking && (
                <MechanicAssignmentModal
                    booking={assigningBooking}
                    mechanics={mechanics}
                    onClose={() => setAssigningBooking(null)}
                    onAssign={(mechanic) => handleAssignMechanic(assigningBooking.id, mechanic)}
                />
            )}
            {cancellingBooking && (<CancellationModal booking={cancellingBooking} onClose={() => setCancellingBooking(null)} onConfirm={handleConfirmCancellation} />)}
            {viewingBooking && (<BookingDetailsModal booking={viewingBooking} customer={viewingCustomer} onClose={() => setViewingBooking(null)} />)}
            {viewingMapBooking && (<BookingLocationModal booking={viewingMapBooking} onClose={() => setViewingMapBooking(null)} />)}
            {priceDetailsBooking && (
                <PriceBreakdownModal
                    booking={priceDetailsBooking}
                    onClose={() => setPriceDetailsBooking(null)}
                />
            )}
            {previewImageUrl && (
                <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => { setPreviewImageUrl(null); setPreviewDocName(null); }}>
                    <div className="relative max-w-4xl w-full bg-[#151515] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header bar */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
                            <span className="text-xs font-black tracking-widest text-gray-400 uppercase truncate max-w-[50%]">{previewDocName || "Document Preview"}</span>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={previewImageUrl} 
                                    download={previewDocName || "document.png"} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-black tracking-widest text-[9px] uppercase rounded-lg border border-white/10 transition-all"
                                >
                                    <Download size={12} /> Download
                                </a>
                                <button 
                                    onClick={() => window.open(previewImageUrl, '_blank')} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-black tracking-widest text-[9px] uppercase rounded-lg border border-white/10 transition-all"
                                >
                                    <ExternalLink size={12} /> Open Original
                                </button>
                                <button 
                                    onClick={() => { setPreviewImageUrl(null); setPreviewDocName(null); }} 
                                    className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10 shrink-0"
                                    aria-label="Close preview"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Image / PDF body container */}
                        <div className="p-6 flex flex-col items-center justify-center bg-black/40 min-h-[300px] md:min-h-[500px] max-h-[70vh] overflow-y-auto relative">
                            {previewImageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                                </div>
                            )}
                            {previewImageUrl.startsWith('data:application/pdf') || previewDocName?.toLowerCase().endsWith('.pdf') ? (
                                <iframe 
                                    src={previewImageUrl} 
                                    className="w-full h-[60vh] rounded-lg border border-white/10 bg-white"
                                    onLoad={() => setPreviewImageLoading(false)}
                                />
                            ) : (
                                <img 
                                    src={previewImageUrl} 
                                    alt={previewDocName || "Document Preview"} 
                                    className={`max-w-full max-h-[60vh] object-contain rounded-xl border border-white/5 shadow-2xl transition-opacity duration-300 ${previewImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                    onLoad={() => setPreviewImageLoading(false)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            {showDeleteAllConfirm && (
                <Modal title="Delete All Bookings" isOpen={true} onClose={() => setShowDeleteAllConfirm(false)}>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex gap-3">
                            <XCircle className="flex-shrink-0 mt-0.5 text-red-400" />
                            <div>
                                <h4 className="font-bold text-sm text-white">Critical Warning</h4>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    This operation will permanently delete <strong>all booking records</strong>, service payments, logs, and associated details from the database. This action is irreversible.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteAllConfirm(false)}
                                disabled={isDeletingAll}
                                className="bg-[#1E1E1E] text-white font-bold py-2.5 px-5 rounded-xl hover:bg-gray-800 transition text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAllBookings}
                                disabled={isDeletingAll}
                                className="bg-red-600 text-white font-black py-2.5 px-5 rounded-xl hover:bg-red-700 transition text-xs shadow-lg shadow-red-600/20 flex items-center gap-1.5"
                            >
                                {isDeletingAll ? <Spinner size="sm" color="text-white" /> : <Trash2 size={14} />}
                                {isDeletingAll ? 'Deleting...' : 'Permanently Delete All'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminBookingsScreen;
