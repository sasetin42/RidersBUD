
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus, Customer, Mechanic } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Calendar, Clock, CheckCircle, XCircle, DollarSign, Users, Download, Eye, Edit, Trash2, ArrowUpDown, ChevronDown, Search, ShieldCheck, ExternalLink, X, Wrench, MapPin } from 'lucide-react';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import MapComponent, { MapMarker } from '../../components/MapComponent';
import { ref, onValue } from 'firebase/database';
import { rtdb, db as firestoreDB } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getFallbackImageForCategory } from '../../utils/fallbackImages';
import { getProfileImage } from '../../utils/imageConstants';
import Tooltip from '../../components/ui/Tooltip';

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




// Quick Action Button Component
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
                            const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
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
                        <h3 className="text-gray-500 font-black  tracking-widest text-xs mb-2">Payment Status</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {booking.isPaid ? (
                                    <>
                                        <div className="p-2 bg-green-500 rounded-full shadow-lg shadow-green-500/20"><CheckCircle size={20} className="text-white" /></div>
                                        <div>
                                            <p className="font-black text-white">Payment Received</p>
                                            <p className="text-xs text-green-500 font-bold  tracking-wider">Confirmed</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/20"><Clock size={20} className="text-white" /></div>
                                        <div>
                                            <p className="font-black text-white">{booking.paymentStatus === 'partial' ? 'Partial (50%)' : 'Payment Pending'}</p>
                                            <p className="text-xs text-yellow-500 font-bold  tracking-wider">{booking.paymentMethod === 'GCash' ? 'GCash Secured' : 'Awaiting Collection'}</p>
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
                                    <span className="text-[10px] font-black  tracking-tighter">View Receipt</span>
                                </a>
                            )}
                        </div>
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
    const originalServicesTotal = svcs.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0);
    const paidDownpayment = Number(booking.paidAmount) || (originalServicesTotal * 0.5);
    const serviceBalance = Math.max(0, originalServicesTotal - paidDownpayment);
    
    const additionalCosts = (booking as any).additionalCosts || [];
    const additionalCostsTotal = additionalCosts.reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
    
    const totalAmount = originalServicesTotal + additionalCostsTotal;
    const remainingBalance = serviceBalance + additionalCostsTotal;

    const downpaymentReceipt = booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl || (booking as any).downpaymentReceiptUrl;
    const downpaymentRef = booking.gcashDownpaymentReference || booking.gcashReference || (booking as any).downpaymentReference;
    const finalReceipt = booking.gcashBalanceReceiptUrl || (booking as any).balanceReceiptUrl;
    const finalRef = booking.gcashBalanceReference;

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
                                <span className="text-green-400">{paidDownpayment > 0 ? `₱${paidDownpayment.toLocaleString()}` : '—'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Final Payment Due</span>
                                <span className="text-sm font-black text-emerald-400">{remainingBalance > 0 ? `₱${remainingBalance.toLocaleString()}` : 'For Quotation'}</span>
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
    const mapMarkers = useMemo(() => {
        if (!booking.location || typeof L === 'undefined') return [];
        return [{
            id: 'service-location',
            position: [booking.location.lat, booking.location.lng] as [number, number],
            popupContent: `<div class="text-center font-bold"><p class="text-primary text-sm">Service Location</p><p class="text-xs text-gray-600 mt-1">${booking.location.address || 'Customer Location'}</p></div>`,
            icon: L.divIcon({
                html: `
                    <div class="relative flex items-center justify-center">
                        <!-- Pulsing ring animation -->
                        <div class="absolute w-16 h-16 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                        <div class="absolute w-12 h-12 bg-red-500 rounded-full opacity-50 animate-pulse"></div>
                        <!-- Main pin icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 relative z-10" viewBox="0 0 20 20" fill="#EF4444" style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));">
                            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        <!-- White center dot -->
                        <div class="absolute top-[14px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full z-20"></div>
                    </div>
                `,
                className: 'bg-transparent border-0',
                iconSize: [48, 48],
                iconAnchor: [24, 48],
                popupAnchor: [0, -48]
            })
        }];
    }, [booking]);

    return (
        <Modal title={`Service Location - Booking #${booking.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                {booking.location ? (
                    <>
                        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
                            <MapComponent
                                center={[booking.location.lat, booking.location.lng]}
                                zoom={15}
                                markers={mapMarkers}
                            />
                        </div>
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold  tracking-widest">Coordinates</p>
                                <p className="text-white font-mono font-bold">{(booking.location.lat || 0).toFixed(6)}, {(booking.location.lng || 0).toFixed(6)}</p>
                            </div>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${booking.location.lat},${booking.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold  tracking-wider hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2"
                            >
                                <Search size={14} /> Open in Google Maps
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <p className="text-gray-500 font-bold">No precise location data available for this booking.</p>
                    </div>
                )}
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all  tracking-wider text-xs">Close</button>
                </div>
            </div>
        </Modal>
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

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(prev => prev + 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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

    const mapMarkers = useMemo(() => {
        const markers: MapMarker[] = [];
        if (typeof L === 'undefined') return markers;

        const customerPic = customerObj?.picture || '';
        const mechanicPic = mechanicObj?.imageUrl || booking.mechanic?.imageUrl || '';

        const customerHtml = `
            <div class="rb-map-pin-wrapper">
                <div class="rb-pin-circle" style="border: 2.5px solid #3B82F6; background: #121212; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                    ${customerPic ? `
                        <img src="${customerPic}" alt="Customer" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
                    ` : `
                        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#3B82F6;">
                            ${(booking.customerName || 'C').charAt(0)}
                        </div>
                    `}
                </div>
                <div class="rb-pin-stem" style="background: #3B82F6;"></div>
                <div class="rb-pin-dot" style="background: #3B82F6; box-shadow: 0 0 6px #3B82F6;"></div>
            </div>
        `;

        const customerIcon = L.divIcon({
            html: customerHtml,
            className: 'rb-leaflet-icon',
            iconSize: [42, 68],
            iconAnchor: [21, 68],
            popupAnchor: [0, -72]
        });

        const mechanicHtml = `
            <div class="rb-map-pin-wrapper pulse-available">
                <div class="rb-pin-circle" style="border: 2.5px solid #FE7803; background: #121212; box-shadow: 0 4px 12px rgba(254, 120, 3, 0.4);">
                    ${mechanicPic ? `
                        <img src="${mechanicPic}" alt="Mechanic" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
                    ` : `
                        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#FE7803;">
                            M
                        </div>
                    `}
                </div>
                <div class="rb-pin-stem" style="background: #FE7803;"></div>
                <div class="rb-pin-dot" style="background: #FE7803; box-shadow: 0 0 6px #FE7803;"></div>
            </div>
        `;

        const mechanicIcon = L.divIcon({
            html: mechanicHtml,
            className: 'rb-leaflet-icon',
            iconSize: [42, 68],
            iconAnchor: [21, 68],
            popupAnchor: [0, -72]
        });

        // Base customer service location
        let baseLat = NaN;
        let baseLng = NaN;
        if (booking.location) {
            baseLat = Number(booking.location.lat);
            baseLng = Number(booking.location.lng);
        }

        if (!isNaN(baseLat) && !isNaN(baseLng)) {
            markers.push({
                id: 'serviceLocation',
                position: [baseLat, baseLng],
                popupContent: `Service Location: ${booking.customerName || 'Customer'}`,
                icon: customerIcon
            });
        }

        // Live customer location
        if (customerLiveLocation) {
            const lat = Number(customerLiveLocation.lat);
            const lng = Number(customerLiveLocation.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                markers.push({
                    id: 'customerLive',
                    position: [lat, lng],
                    popupContent: `Customer (Live)`,
                    icon: customerIcon
                });
            }
        }

        // Live mechanic location (simulated movement)
        if (mechanicLiveLocation) {
            const lat = Number(mechanicLiveLocation.lat);
            const lng = Number(mechanicLiveLocation.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                const simulatedLat = lat + Math.sin(time / 5000) * 0.0005;
                const simulatedLng = lng + Math.cos(time / 5000) * 0.0005;
                markers.push({
                    id: 'mechanicLive',
                    position: [simulatedLat, simulatedLng],
                    popupContent: `Mechanic (Live): ${booking.mechanic?.name || 'Assigned'}`,
                    icon: mechanicIcon
                });
            }
        } else if ((booking.status === 'En Route' || booking.status === 'In Progress') && !isNaN(baseLat) && !isNaN(baseLng)) {
            // If no live location but status is active, simulate one starting from customer location + offset
            const simBaseLat = baseLat + 0.003;
            const simBaseLng = baseLng + 0.003;
            const simulatedLat = simBaseLat + Math.sin(time / 5000) * 0.0005;
            const simulatedLng = simBaseLng + Math.cos(time / 5000) * 0.0005;
            markers.push({
                id: 'mechanicSimulated',
                position: [simulatedLat, simulatedLng],
                popupContent: `Mechanic (Simulated): ${booking.mechanic?.name || 'Assigned'}`,
                icon: mechanicIcon
            });
        } else if (booking.status === 'Completed' && !isNaN(baseLat) && !isNaN(baseLng)) {
            if (!markers.some(m => m.id === 'serviceLocation')) {
                markers.push({
                    id: 'serviceLocation',
                    position: [baseLat, baseLng],
                    popupContent: `Service Location: ${booking.customerName || 'Customer'}`,
                    icon: customerIcon
                });
            }
            markers.push({
                id: 'mechanicCompleted',
                position: [baseLat + 0.00015, baseLng + 0.00015],
                popupContent: `Mechanic: ${booking.mechanic?.name || 'Assigned'}`,
                icon: mechanicIcon
            });
        }

        return markers;
    }, [booking, customerLiveLocation, mechanicLiveLocation, time, customerObj, mechanicObj]);

    const centerPoint: [number, number] = useMemo(() => {
        if (booking.location) {
            const lat = Number(booking.location.lat);
            const lng = Number(booking.location.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                return [lat, lng];
            }
        }
        return [14.5995, 120.9842]; // Fallback to Manila
    }, [booking.location]);

    return (
        <div className="w-full h-full min-h-[140px] rounded-2xl bg-[#101010] relative overflow-hidden border border-white/5">
            <MapComponent 
                center={centerPoint} 
                zoom={14} 
                markers={mapMarkers} 
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
    const { db, updateBookingStatus, cancelBooking, updateBooking, updateBookingPayment, assignMechanicToBooking, verifyBookingPayment, loading, deleteAllBookings, deleteBooking, updateLiaisonBookingStatus } = useDatabase();
    const { addNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [datePreset, setDatePreset] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [activeAdminTab, setActiveAdminTab] = useState<'Services' | 'Car Rental' | 'Driver for Hire' | 'Liaison' | 'Towing'>('Services');
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
            alert(`All ${categoryName} have been successfully deleted from the database.`);
        } catch (err) {
            console.error("Failed to delete bookings", err);
            alert("Failed to delete bookings. Please try again.");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedBookingId(expandedBookingId === id ? null : id);
    };

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const { mechanics, settings } = db;

    const bookings = React.useMemo(() => {
        if (!db) return [];
        
        if (activeAdminTab === 'Services') {
            return db.bookings || [];
        } else if (activeAdminTab === 'Car Rental') {
            return (db.rentalBookings || []).map(b => {
                const customer = db.customers?.find(c => c.id === b.customerId);
                const car = db.rentalCars?.find(c => c.id === b.carId);
                return {
                    id: b.id,
                    customerId: b.customerId,
                    customerName: customer?.name || b.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || 'No email',
                    customerPhone: customer?.phone || 'No phone',
                    vehicle: {
                        make: car?.make || 'Car Rental',
                        model: car?.model || '',
                        year: car?.year || '',
                        plateNumber: car?.plateNumber || ''
                    },
                    services: [{
                        id: b.carId,
                        name: `Car Rental (${car?.make} ${car?.model})`,
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
                    vehicleDesc: `${b.startDate} to ${b.endDate}`,
                    statusHistory: b.statusHistory || [],
                    notes: b.notes,
                    isRental: true,
                };
            });
        } else if (activeAdminTab === 'Driver for Hire') {
            const requests = (db.serviceRequests || []).filter(req => 
                (req.serviceName || '').toLowerCase().includes('driver')
            );
            return requests.map(req => {
                const customer = db.customers?.find(c => c.id === req.customerId);
                return {
                    id: req.id,
                    customerId: req.customerId,
                    customerName: customer?.name || req.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || 'No email',
                    customerPhone: customer?.phone || 'No phone',
                    vehicle: {
                        make: 'Driver service request',
                        model: '',
                        year: '',
                        plateNumber: ''
                    },
                    services: [{
                        id: req.id,
                        name: req.serviceName || 'Driver for Hire',
                        category: 'Driver for Hire',
                        price: 0
                    }],
                    date: req.scheduledDate || req.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                    time: '08:00',
                    status: req.status || 'Pending',
                    isPaid: false,
                    totalAmount: 0,
                    createdAt: req.createdAt,
                    notes: req.notes
                };
            });
        } else if (activeAdminTab === 'Liaison') {
            return (db.liaisonBookings || []).map(b => {
                const customer = db.customers?.find(c => c.id === b.customerId);
                return {
                    id: b.id,
                    customerId: b.customerId,
                    customerName: customer?.name || b.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || 'No email',
                    customerPhone: customer?.phone || 'No phone',
                    vehicle: {
                        make: b.vehicleDetails?.brand || '',
                        model: b.vehicleDetails?.model || '',
                        year: b.vehicleDetails?.year || '',
                        plateNumber: b.vehicleDetails?.plateNumber || ''
                    },
                    services: [{
                        id: b.id,
                        name: `LTO Liaison (${b.serviceType})`,
                        category: 'Liason Services',
                        price: b.paymentStatus === 'Paid' ? 500 : 0
                    }],
                    date: b.appointmentDate,
                    time: b.appointmentTime,
                    status: b.status || 'Booking Received',
                    isPaid: b.paymentStatus === 'Paid',
                    totalAmount: b.paymentStatus === 'Paid' ? 500 : 0,
                    createdAt: b.createdAt || b.appointmentDate,
                    agentName: b.liaisonName || 'Unassigned',
                    branchName: b.branchName || '',
                    documents: b.documents || []
                };
            });
        } else if (activeAdminTab === 'Towing') {
            const requests = (db.serviceRequests || []).filter(req => 
                (req.serviceName || '').toLowerCase().includes('towing')
            );
            return requests.map(req => {
                const customer = db.customers?.find(c => c.id === req.customerId);
                return {
                    id: req.id,
                    customerId: req.customerId,
                    customerName: customer?.name || req.customerName || 'Unknown Customer',
                    customerEmail: customer?.email || 'No email',
                    customerPhone: customer?.phone || 'No phone',
                    vehicle: {
                        make: 'Towing request',
                        model: '',
                        year: '',
                        plateNumber: ''
                    },
                    services: [{
                        id: req.id,
                        name: req.serviceName || 'Towing / Roadside Assistance',
                        category: 'Towing',
                        price: 0
                    }],
                    date: req.scheduledDate || req.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                    time: '08:00',
                    status: req.status || 'Pending',
                    isPaid: false,
                    totalAmount: 0,
                    createdAt: req.createdAt,
                    notes: req.notes
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
                    await updateDoc(doc(firestoreDB, 'rentalBookings', booking.id), { status: newStatus });
                } else {
                    await updateDoc(doc(firestoreDB, 'serviceRequests', booking.id), { status: newStatus });
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
                    await updateDoc(doc(firestoreDB, 'rentalBookings', cancellingBooking.id), { status: 'Cancelled', cancelReason: reason });
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
        const bookingTotal = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
        const remaining = bookingTotal - (booking.paidAmount || 0);

        try {
            await updateBookingPayment(bookingId, remaining, 'paid');
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
            const searchMatch = searchQuery === '' || 
                (booking.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                svcs.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
            let dateMatch = true;
            if (dateFilter.start && dateFilter.end) {
                const startDate = new Date(dateFilter.start.replace(/-/g, '/')).getTime();
                const endDateObj = new Date(dateFilter.end.replace(/-/g, '/'));
                endDateObj.setDate(endDateObj.getDate() + 1);
                const endDate = endDateObj.getTime();
                const bookingDate = new Date(booking.date.replace(/-/g, '/')).getTime();
                dateMatch = bookingDate >= startDate && bookingDate < endDate;
            }
            return mechanicMatch && categoryMatch && statusMatch && searchMatch && dateMatch && paymentMatch;
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
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig, dateFilter, paymentFilter, bookingSequences, activeAdminTab]);

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
            if (b.totalAmount != null) return b.totalAmount;
            const svcs = b.services && b.services.length > 0 ? b.services : b.service ? [b.service] : [];
            return svcs.reduce((s, svc) => s + svc.price, 0);
        };
        const totalRevenue = tabBookings.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0);
        const pendingRevenue = tabBookings.filter(b => b.status === 'Completed' && !b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0);
        const avgBookingValue = tabBookings.length > 0 ? totalRevenue / (tabBookings.filter(b => b.status === 'Completed' && b.isPaid).length || 1) : 0;

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

        return {
            total: tabBookings.length,
            totalTrend: trendCalc(last30Days.length, previous30Days.length),
            upcoming: tabBookings.filter(b => upcomingStatuses.includes(b.status || '')).length,
            completed: tabBookings.filter(b => b.status === 'Completed').length,
            completedTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed').length,
                previous30Days.filter(b => b.status === 'Completed').length
            ),
            cancelled: tabBookings.filter(b => b.status === 'Cancelled').length,
            totalRevenue,
            revenueTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0),
                previous30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0)
            ),
            pendingRevenue,
            avgBookingValue,
            todayBookings
        };
    }, [bookings, activeAdminTab]);

    const activeFiltersCount = [
        selectedMechanicId !== 'all',
        selectedCategory !== 'all',
        selectedStatus !== 'all',
        paymentFilter !== 'all',
        dateFilter.start !== '' || dateFilter.end !== ''
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setSelectedMechanicId('all');
        setSelectedCategory('all');
        setSelectedStatus('all');
        setPaymentFilter('all');
        setDateFilter({ start: '', end: '' });
        setDatePreset('all');
        setSearchQuery('');
    };

    return (
        <div className="text-admin-text-primary flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
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

                {/* Enhanced KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <EnhancedKPICard
                        title="Total Bookings"
                        value={bookingStats.total}
                        icon={<Calendar className="w-5 h-5 text-white" />}
                        gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                        trend={bookingStats.totalTrend}
                        subtitle="Last 30 days"
                    />
                    <EnhancedKPICard
                        title="Total Revenue"
                        value={`₱${bookingStats.totalRevenue.toLocaleString()}`}
                        icon={<DollarSign className="w-5 h-5 text-white" />}
                        gradient="bg-gradient-to-br from-green-600 to-green-800"
                        trend={bookingStats.revenueTrend}
                        subtitle={`Avg: ₱${Math.round(bookingStats.avgBookingValue).toLocaleString()}`}
                    />
                    <EnhancedKPICard
                        title="Completed"
                        value={bookingStats.completed}
                        icon={<CheckCircle className="w-5 h-5 text-white" />}
                        gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                        trend={bookingStats.completedTrend}
                        subtitle={`Pending: ₱${bookingStats.pendingRevenue.toLocaleString()}`}
                    />
                    <EnhancedKPICard
                        title="Today's Bookings"
                        value={bookingStats.todayBookings}
                        icon={<Clock className="w-5 h-5 text-white" />}
                        gradient="bg-gradient-to-br from-rose-600 to-rose-800"
                        subtitle={`Active: ${bookingStats.upcoming}`}
                    />
                </div>

                {/* Filters Section */}
                {/* Filters Section */}
                <div className="relative group mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-rose-600 rounded-xl blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                    <div className="relative bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-3.5 rounded-xl space-y-3">

                        {/* Filter Controls */}
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input
                                    id="adminSearchQuery"
                                    name="adminSearchQuery"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={
                                        activeAdminTab === 'Services' ? "Search Customer or Service..." :
                                        activeAdminTab === 'Car Rental' ? "Search Customer or Car..." :
                                        activeAdminTab === 'Driver for Hire' ? "Search Customer..." :
                                        activeAdminTab === 'Liaison' ? "Search Customer or Liaison Service..." :
                                        "Search Customer or Towing Location..."
                                    }
                                    className="h-9 w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 text-white text-xs font-bold placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all hover:bg-white/10 hover:border-white/20"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {activeAdminTab === 'Services' && (
                                    <select
                                        id="selectedMechanicId"
                                        name="selectedMechanicId"
                                        value={selectedMechanicId}
                                        onChange={(e) => setSelectedMechanicId(e.target.value)}
                                        className="h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                    >
                                        <option value="all">All Mechanics</option>
                                        {mechanics.filter(m => m.status === 'Active').map(mechanic => (
                                            <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
                                        ))}
                                    </select>
                                )}
                                <select
                                    id="selectedStatus"
                                    name="selectedStatus"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                >
                                    {bookingStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status === 'all' ? 'All Statuses' : status}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    id="paymentFilter"
                                    name="paymentFilter"
                                    value={paymentFilter}
                                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                >
                                    <option value="all">All Payments</option>
                                    <option value="paid">Paid Only</option>
                                    <option value="unpaid">Unpaid Only</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Filters & Presets */}
                        <div className="flex flex-wrap gap-2.5 items-center pt-2.5 border-t border-white/10">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-xs font-bold text-gray-500 mr-2">Quick Range:</span>
                                {['all', 'today', 'week', 'month'].map(preset => (
                                    <Tooltip key={preset} content={`Filter by ${preset === 'all' ? 'all dates' : preset}`}>
                                        <button
                                            onClick={() => handleDatePreset(preset)}
                                            className={`h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${datePreset === preset
                                                ? 'bg-primary text-white shadow-lg'
                                                : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {preset === 'all' ? 'All' : preset}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="dateFilterStart"
                                    name="dateFilterStart"
                                    type="date"
                                    value={dateFilter.start}
                                    onChange={e => { setDateFilter(prev => ({ ...prev, start: e.target.value })); setDatePreset('custom'); }}
                                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    id="dateFilterEnd"
                                    name="dateFilterEnd"
                                    type="date"
                                    value={dateFilter.end}
                                    min={dateFilter.start}
                                    onChange={e => { setDateFilter(prev => ({ ...prev, end: e.target.value })); setDatePreset('custom'); }}
                                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-white font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                />
                            </div>

                            <div className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${activeFiltersCount > 0 ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                                <Tooltip content="Remove all applied filters">
                                    <button
                                        onClick={clearAllFilters}
                                        className="h-9 px-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg font-bold text-xs hover:bg-red-500 hover:text-white transition-all whitespace-nowrap cursor-pointer"
                                    >
                                        Clear Filters ({activeFiltersCount})
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
            {/* Enhanced Table */}
            <div className="flex-1 overflow-auto space-y-6">
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
                                                    const customerObj = db.customers.find(c => c.name === booking.customerName || c.id === booking.customerId);
                                                    return (
                                                        <div className="flex items-center gap-2.5 max-w-[160px]">
                                                            {customerObj?.picture ? (
                                                                <img 
                                                                    src={customerObj.picture} 
                                                                    alt={booking.customerName} 
                                                                    className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" 
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                                                    {booking.customerName.charAt(0)}
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
                                                            const names = svcs.map(s => s.name).join(', ') || 'Unknown Service';
                                                            const cats = [...new Set(svcs.map(s => s.category).filter(Boolean))].join(', ') || 'N/A';
                                                            return (
                                                                <div>
                                                                    <p className="font-bold text-gray-300 text-sm">{names}</p>
                                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black tracking-widest border border-blue-500/20">{cats}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-2 px-3 hidden lg:table-cell">
                                                        <p className="text-xs font-bold text-gray-300">{booking.vehicle?.make || ''} {booking.vehicle?.model || 'N/A'}</p>
                                                        <p className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-widest">{booking.vehicle?.plateNumber || 'No Plate'}</p>
                                                    </td>
                                                    <td className="py-2 px-3 text-sm">
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
                                                                        <span className="font-bold text-gray-300 text-xs truncate" title={liveMechanic.name}>
                                                                            {liveMechanic.name}
                                                                        </span>
                                                                        <span className="text-[9px] text-gray-500 font-bold truncate">
                                                                            {liveMechanic.specializations?.[0] || liveMechanic.specialization || 'Mechanic'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 font-bold text-xs">Unassigned</span>
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
                                                    <p className="font-bold text-white text-xs">{booking.date}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">{formatTimeToAmPm(booking.time)}</p>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                {(() => {
                                                    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                    const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
                                                    const isGcash = booking.paymentMethod === 'GCash';
                                                    const hasReceipt = !!booking.gcashReceiptUrl;
                                                    const isVerified = booking.isVerified;
                                                    const isDeclined = !!booking.gcashDeclineReason;
                                                    
                                                    let paymentBadge = null;
                                                    if (booking.isPaid) {
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
                                                    } else {
                                                        paymentBadge = (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 text-[8px] font-black tracking-widest uppercase whitespace-nowrap">
                                                                Unpaid
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-green-400 text-sm">{total > 0 ? `₱${total.toLocaleString()}` : 'For Quotation'}</span>
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
                                                                        const customerObj = db.customers.find(c => c.name === booking.customerName || c.id === booking.customerId);
                                                                        return (
                                                                            <div className="flex items-center gap-3">
                                                                                {customerObj?.picture ? (
                                                                                    <img 
                                                                                        src={customerObj.picture} 
                                                                                        alt={booking.customerName} 
                                                                                        className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" 
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/20 shrink-0">
                                                                                        {booking.customerName.charAt(0)}
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
                                                                        <h4 className="text-[10px] font-black tracking-widest text-gray-600 mb-2 ml-1">Payment Status</h4>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div>
                                                                                        {(() => {
                                                                                            const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                                                            const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
                                                                                            return (
                                                                                                <div 
                                                                                                    className="flex items-baseline gap-2 cursor-pointer group/price hover:opacity-80 transition-opacity"
                                                                                                    onClick={() => setPriceDetailsBooking(booking)}
                                                                                                    title="Click to view price breakdown"
                                                                                                >
                                                                                                    <span className="text-sm font-black text-white group-hover/price:text-primary transition-colors">{total > 0 ? `₱${total.toLocaleString()}` : 'For Quotation'}</span>
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setPriceDetailsBooking(booking); }}
                                                                                            className="px-2.5 py-1 bg-[#FF7903] hover:bg-[#e06800] text-white font-black text-[9px] uppercase tracking-wider rounded transition-colors shadow-md"
                                                                                        >
                                                                                            DETAILS
                                                                                        </button>
                                                                                        {!booking.isPaid && booking.paymentMethod !== 'GCash' && (
                                                                                            <Tooltip content="Mark as fully paid">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); handleMarkPaid(booking.id); }}
                                                                                                    className="p-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-50 hover:text-white transition-all border border-green-500/20"
                                                                                                >
                                                                                                    <DollarSign size={12} />
                                                                                                </button>
                                                                                            </Tooltip>
                                                                                        )}
                                                                                        {booking.isPaid && <Tooltip content="Payment confirmed"><div className="p-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20"><CheckCircle size={12} /></div></Tooltip>}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Always-visible 2-column payment receipt section */}
                                                                                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        {/* Down Payment Receipt */}
                                                                                        <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 flex flex-col gap-2">
                                                                                            {(() => {
                                                                                                const originalServicesFee = booking.services && booking.services.length > 0
                                                                                                    ? booking.services.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0)
                                                                                                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                                                                                                const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                                                                                                return (
                                                                                                    <div>
                                                                                                        <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase mb-0.5">1st Payment</p>
                                                                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                                                            <span className="text-[11px] font-black text-primary">{originalServicesFee > 0 ? `₱${paidDownpayment.toLocaleString()}` : '—'}</span>
                                                                                                            {booking.isVerified && (
                                                                                                                <span className="inline-flex items-center bg-green-500/10 text-green-400 border border-green-500/20 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded">
                                                                                                                    PAID
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
                                                                                            {(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl) ? (
                                                                                                <div
                                                                                                    className="rounded-lg border border-white/10 overflow-hidden bg-black/40 h-20 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                                                                                    onClick={() => setPreviewImageUrl(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl)}
                                                                                                >
                                                                                                    <img
                                                                                                        src={booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl}
                                                                                                        alt="1st Payment"
                                                                                                        className="w-full h-full object-contain"
                                                                                                    />
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="rounded-lg border border-white/5 border-dashed h-20 flex flex-col items-center justify-center text-center p-1 bg-black/20">
                                                                                                    <span className="text-[8px] font-bold text-gray-600">Awaiting Upload</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Final Payment Receipt */}
                                                                                        <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 flex flex-col gap-2">
                                                                                            {(() => {
                                                                                                const originalServicesFee = booking.services && booking.services.length > 0
                                                                                                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                                                                                                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                                                                                                const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                                                                                                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                                                                                                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                                                                                                const finalPaymentAmount = serviceBalance + additionalCostsTotal;
                                                                                                return (
                                                                                                    <div>
                                                                                                        <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase mb-0.5">Final Payment</p>
                                                                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                                                            <span className="text-[11px] font-black text-primary">{finalPaymentAmount > 0 ? `₱${finalPaymentAmount.toLocaleString()}` : 'For Quotation'}</span>
                                                                                                            {booking.isPaid && (
                                                                                                                <span className="inline-flex items-center bg-green-500/10 text-green-400 border border-green-500/20 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded">
                                                                                                                    PAID
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
                                                                                            {booking.gcashBalanceReceiptUrl ? (
                                                                                                <div
                                                                                                    className="rounded-lg border border-white/10 overflow-hidden bg-black/40 h-20 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                                                                                    onClick={() => setPreviewImageUrl(booking.gcashBalanceReceiptUrl)}
                                                                                                >
                                                                                                    <img
                                                                                                        src={booking.gcashBalanceReceiptUrl}
                                                                                                        alt="Final Payment"
                                                                                                        className="w-full h-full object-contain"
                                                                                                    />
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="rounded-lg border border-white/5 border-dashed h-20 flex flex-col items-center justify-center text-center p-1 bg-black/20">
                                                                                                    <span className="text-[8px] font-bold text-gray-600">Awaiting Upload</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {!booking.isVerified && (booking.gcashReference || booking.gcashReceiptUrl) && (
                                                                                        <div className="pt-1">
                                                                                            <Tooltip content="Verify GCash payment" className="w-full">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); verifyBookingPayment(booking.id); }}
                                                                                                    className="w-full h-9 py-2 bg-[#FF7903] hover:bg-[#e06800] text-white font-black tracking-widest text-[9px] rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5"
                                                                                                >
                                                                                                    <ShieldCheck size={11} /> Verify Payment
                                                                                                </button>
                                                                                            </Tooltip>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                            {/* Legacy GCash Verified card removed */}
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
                                                                    {activeAdminTab === 'Services' && (
                                                                        <>
                                                                            <div className="flex gap-3 items-start">
                                                                                <img 
                                                                                    src={booking.service?.imageUrl || getFallbackImageForCategory(booking.service?.category)} 
                                                                                    alt={booking.service?.name || 'Service'} 
                                                                                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).src = getFallbackImageForCategory(booking.service?.category);
                                                                                    }}
                                                                                />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-primary font-black text-sm leading-tight truncate">{booking.service?.name || 'Unknown Service'}</p>
                                                                                    <p className="text-[10px] text-gray-500 mt-1 leading-normal line-clamp-2">{booking.service?.description || 'No description.'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <Clock size={14} className="text-primary shrink-0" />
                                                                                    <div>
                                                                                        <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Duration</p>
                                                                                        <p className="text-[11px] font-black text-white mt-0.5">{booking.service?.duration || 'N/A'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <Calendar size={14} className="text-primary shrink-0" />
                                                                                    <div>
                                                                                        <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Scheduled</p>
                                                                                        <p className="text-[11px] font-black text-white mt-0.5">{booking.date}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="pt-2 border-t border-white/5 mt-auto">
                                                                                <h4 className="text-[9px] font-black tracking-widest text-gray-600 mb-2 ml-1">Assigned Mechanic</h4>
                                                                                {booking.mechanic ? (
                                                                                    <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/5">
                                                                                        {booking.mechanic.imageUrl ? (
                                                                                            <img
                                                                                                src={getProfileImage(booking.mechanic.imageUrl, 'mechanic')}
                                                                                                alt={booking.mechanic.name}
                                                                                                className="w-8 h-8 rounded-xl object-cover border border-white/10 shrink-0"
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center text-sm font-black text-primary shrink-0">
                                                                                                {booking.mechanic.name.charAt(0)}
                                                                                            </div>
                                                                                        )}
                                                                                        <div>
                                                                                            <p className="font-black text-white text-xs">{booking.mechanic.name}</p>
                                                                                            <p className="text-[9px] text-gray-500 font-bold">Elite Professional</p>
                                                                                        </div>
                                                                                        <Tooltip content="Reassign mechanic">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                                                className="ml-auto p-1.5 text-gray-500 hover:text-primary transition-colors"
                                                                                            >
                                                                                                <Edit size={14} />
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Tooltip content="Assign a mechanic to this booking">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setAssigningBooking(booking); }}
                                                                                            className="w-full py-2 bg-primary text-white font-black tracking-widest text-[9px] rounded-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5"
                                                                                        >
                                                                                            <Users size={12} /> Assign Mechanic
                                                                                        </button>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}

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

                                                                    {activeAdminTab === 'Car Rental' && (
                                                                        <>
                                                                            <div className="flex gap-3 items-start">
                                                                                <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                                                                    <Calendar size={24} />
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-primary font-black text-sm leading-tight truncate">{booking.services?.[0]?.name || 'Rental Vehicle'}</p>
                                                                                    <p className="text-[10px] text-gray-500 mt-1 leading-normal line-clamp-2">Option: {booking.deliveryOption || 'Self Pickup'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <Calendar size={14} className="text-primary shrink-0" />
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Rental Period</p>
                                                                                        <p className="text-[10px] font-black text-white mt-0.5 truncate" title={booking.vehicleDesc}>{booking.vehicleDesc}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex items-center gap-2">
                                                                                    <Search size={14} className="text-primary shrink-0" />
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase">Pickup Location</p>
                                                                                        <p className="text-[10px] font-black text-white mt-0.5 truncate" title={booking.pickupLocation}>{booking.pickupLocation || 'Branch Office'}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {activeAdminTab === 'Driver for Hire' && (() => {
                                                                        const currentFields = editingDriverFields[booking.id] || {
                                                                            driverName: booking.driverName || 'Pending Assignment',
                                                                            driverPhone: booking.driverPhone || '',
                                                                            estimatedArrivalTime: booking.estimatedArrivalTime || '',
                                                                            remarks: booking.remarks || ''
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

                                                                        const handleSaveDetails = async () => {
                                                                            try {
                                                                                await updateDoc(doc(firestoreDB, 'serviceRequests', booking.id), {
                                                                                    driverName: currentFields.driverName,
                                                                                    driverPhone: currentFields.driverPhone,
                                                                                    estimatedArrivalTime: currentFields.estimatedArrivalTime,
                                                                                    remarks: currentFields.remarks
                                                                                });
                                                                                addNotification({ type: 'success', title: 'Driver Assigned', message: 'Driver details updated successfully.', recipientId: 'admin' });
                                                                            } catch (e) {
                                                                                addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
                                                                            }
                                                                        };

                                                                        return (
                                                                            <div className="space-y-3 flex-1 flex flex-col justify-between">
                                                                                <div className="space-y-2.5">
                                                                                    {/* Trip details overview */}
                                                                                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1 text-[10px]">
                                                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Route:</span> <span className="text-white font-medium">{booking.details?.pickupLocation || 'N/A'} ➔ {booking.details?.destination || 'N/A'}</span></div>
                                                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Vehicle:</span> <span className="text-white font-medium">{booking.vehicleDetails ? `${booking.vehicleDetails.brand} ${booking.vehicleDetails.model} (${booking.vehicleDetails.plateNumber})` : 'Driver provides vehicle'}</span></div>
                                                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Duration:</span> <span className="text-white font-medium">{booking.details?.duration || 'N/A'}</span></div>
                                                                                        <div><span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Customer Notes:</span> <span className="text-gray-400 italic">"{booking.notes || 'No notes'}"</span></div>
                                                                                    </div>

                                                                                    <div className="pt-2 border-t border-white/5">
                                                                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">// Coordinate & Assign Driver</h4>
                                                                                        
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            {/* Driver Selector */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Driver Name</label>
                                                                                                <select 
                                                                                                    value={currentFields.driverName}
                                                                                                    onChange={e => handleFieldChange('driverName', e.target.value)}
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none cursor-pointer"
                                                                                                >
                                                                                                    {['Pending Assignment', 'Cristopher Cruz', 'Danilo Santos', 'Generoso Reyes', 'Efren Salonga'].map(name => (
                                                                                                        <option key={name} value={name} className="bg-[#121212]">{name}</option>
                                                                                                    ))}
                                                                                                </select>
                                                                                            </div>

                                                                                            {/* Driver Phone */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Driver Contact</label>
                                                                                                <input 
                                                                                                    type="tel"
                                                                                                    value={currentFields.driverPhone}
                                                                                                    onChange={e => handleFieldChange('driverPhone', e.target.value)}
                                                                                                    placeholder="Phone number"
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none"
                                                                                                />
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                                                            {/* ETA */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Est. Arrival Time</label>
                                                                                                <input 
                                                                                                    type="text"
                                                                                                    value={currentFields.estimatedArrivalTime}
                                                                                                    onChange={e => handleFieldChange('estimatedArrivalTime', e.target.value)}
                                                                                                    placeholder="e.g. 10:30 AM"
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            
                                                                                            {/* Remarks */}
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Remarks / Remarks</label>
                                                                                                <input 
                                                                                                    type="text"
                                                                                                    value={currentFields.remarks}
                                                                                                    onChange={e => handleFieldChange('remarks', e.target.value)}
                                                                                                    placeholder="Remarks"
                                                                                                    className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[10px] text-white outline-none"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <button
                                                                                    onClick={handleSaveDetails}
                                                                                    className="w-full bg-primary hover:bg-[#e06800] text-white font-bold py-2 rounded-lg transition-all text-[10px] mt-2 shadow-lg shadow-primary/20 uppercase tracking-widest"
                                                                                    style={{ backgroundColor: accentColor }}
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
                                                                            <h4 className="text-[9px] font-black  tracking-widest text-gray-600 ml-1">Update Status</h4>
                                                                            <div className="flex gap-2">
                                                                                <div className="flex-1 relative group/select">
                                                                                    <select id={`booking-status-${booking.id}`} name={`booking-status-${booking.id}`}
                                                                                        value={booking.status}
                                                                                        onChange={(e) => handleStatusChange(booking, e.target.value)}
                                                                                        onClick={e => e.stopPropagation()}
                                                                                        className="w-full bg-white/5 border border-white/10 py-2.5 px-3 rounded-lg text-[10px] font-black  tracking-widest text-white hover:border-primary transition-all outline-none appearance-none cursor-pointer"
                                                                                    >
                                                                                        {(() => {
                                                                                            let options = ['Pending', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];
                                                                                            if (activeAdminTab === 'Liaison') {
                                                                                                options = ['Booking Received', 'Processing', 'Assigned', 'Completed', 'Cancelled'];
                                                                                            } else if (activeAdminTab === 'Car Rental') {
                                                                                                options = ['Received', 'Pending', 'Approved', 'Completed', 'Cancelled'];
                                                                                            } else if (activeAdminTab === 'Driver for Hire') {
                                                                                                options = ['Pending Admin Review', 'For Verification', 'Awaiting Driver Availability', 'Driver Assigned', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
                                                                                            } else if (activeAdminTab === 'Towing') {
                                                                                                options = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
                                                                                            }
                                                                                            return options.map(s => <option key={s} value={s} className="bg-[#121212]">{s}</option>);
                                                                                        })()}
                                                                                    </select>
                                                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover/select:text-primary transition-colors" size={14} />
                                                                                </div>
                                                                                {booking.status !== 'Cancelled' && (
                                                                                    <Tooltip content="Cancel this booking">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setCancellingBooking(booking); }}
                                                                                            className="px-4 py-2.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20 font-black  tracking-widest text-[9px]"
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
                                                                    <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                            <Clock size={14} />
                                                                        </div>
                                                                        Progress Tracking
                                                                    </h4>
                                                                    <div className="flex-1 space-y-2 relative pl-3">
                                                                        <div className="absolute left-[19px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
                                                                        {(() => {
                                                                            const timelineData = getTimelineData(booking.status, booking.statusHistory);
                                                                            return timelineData.length > 0 ? (
                                                                                timelineData.map((s, i) => (
                                                                                    <div key={i} className="flex gap-3 relative group/step">
                                                                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black z-10 transition-all duration-300 ${i === timelineData.length - 1 ? 'bg-primary text-white shadow-lg' : 'bg-[#202020] text-gray-600 border border-white/5'}`}>
                                                                                            {i + 1}
                                                                                        </div>
                                                                                        <div className="pt-0.5">
                                                                                            <p className={`text-xs font-black  tracking-widest transition-colors ${i === timelineData.length - 1 ? 'text-white' : 'text-gray-600'}`}>{s.status}</p>
                                                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                                                <Clock size={8} className="text-gray-700" />
                                                                                                <p className="text-[8px] text-gray-700 font-black  tracking-widest">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-6">
                                                                                    <Clock size={18} className="text-gray-700" />
                                                                                    <p className="text-[10px] text-gray-600 font-bold tracking-wider">No timeline history recorded.</p>
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
                                                                            {/* Pickup Option card */}
                                                                            <div className="bg-white/5 rounded-xl border border-white/5 p-3">
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                                                        <MapPin size={16} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase">Pickup Option</p>
                                                                                        <p className="text-xs font-black text-white mt-0.5">{(booking as any).pickupOption || 'Customer brings documents to branch'}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Pickup Address card */}
                                                                            <div className="bg-white/5 rounded-xl border border-white/5 p-3">
                                                                                <p className="text-[8px] font-black text-gray-500 tracking-wider uppercase mb-1">Pickup Address</p>
                                                                                <p className="text-xs font-bold text-gray-300 leading-relaxed">
                                                                                    {(booking as any).pickupAddress || (booking as any).pickupOption === 'Customer brings documents' ? 'Not applicable (Documents will be delivered directly by customer to LTO Branch)' : 'No pickup address specified.'}
                                                                                </p>
                                                                            </div>

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
                                                                <div className="bg-[#151515] p-2 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all h-full relative overflow-hidden flex flex-col">
                                                                    <div className="p-4 pb-1">
                                                                        <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 flex items-center gap-3">
                                                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                                <Search size={14} />
                                                                            </div>
                                                                            Real-time Location
                                                                        </h4>
                                                                    </div>
                                                                    <div className="flex-1 p-3">
                                                                        <LiveMapCard booking={booking} />
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
                            const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);

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
