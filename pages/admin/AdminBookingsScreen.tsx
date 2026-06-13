
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus, Customer, Mechanic } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Calendar, Clock, CheckCircle, XCircle, DollarSign, Users, Download, Eye, Edit, Trash2, ArrowUpDown, ChevronDown, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import MapComponent, { MapMarker } from '../../components/MapComponent';

declare const L: any;

import Tooltip from '../../components/ui/Tooltip';

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
                                        <p className="text-5xl font-black text-primary">₱{total.toLocaleString()}</p>
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
    )
}

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
        <Modal title={`Assign Mechanic to Booking #${booking.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                <p className="text-sm text-gray-400">Select a professional to handle this service for <span className="text-white font-bold">{booking.customerName}</span>.</p>
                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {mechanics.filter(m => m.status === 'Active').map(mechanic => (
                        <div
                            key={mechanic.id}
                            className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                            onClick={() => onAssign(mechanic)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-xl font-black text-primary">
                                    {mechanic.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white group-hover:text-primary transition-colors">{mechanic.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold  tracking-widest">{mechanic.specialization || 'Professional Mechanic'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-yellow-400 font-black text-xs">⭐ {mechanic.rating}</p>
                                    <p className="text-[10px] text-gray-600 font-bold ">{mechanic.reviews} Reviews</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4 border-t border-white/5">
                    <button onClick={onClose} className="px-6 py-3 bg-white/5 text-gray-400 font-black  tracking-widest text-[10px] rounded-xl hover:bg-white/10 hover:text-white transition-all">Cancel</button>
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
                                <p className="text-white font-mono font-bold">{booking.location.lat.toFixed(6)}, {booking.location.lng.toFixed(6)}</p>
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


const AdminBookingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db, updateBookingStatus, cancelBooking, updateBooking, updateBookingPayment, assignMechanicToBooking, verifyBookingPayment, loading, deleteAllBookings, deleteBooking } = useDatabase();
    const { addNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [datePreset, setDatePreset] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [viewingMapBooking, setViewingMapBooking] = useState<Booking | null>(null);
    const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleDeleteAllBookings = async () => {
        setIsDeletingAll(true);
        try {
            await deleteAllBookings();
            setShowDeleteAllConfirm(false);
            alert("All bookings have been successfully deleted from the database.");
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

    const { bookings, mechanics, settings } = db;

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
    const bookingStatuses: Array<BookingStatus | 'all'> = ['all', 'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled', 'Reschedule Requested'];

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

    const handleStatusChange = async (booking: Booking, newStatus: BookingStatus) => {
        if (newStatus === 'Cancelled') {
            setCancellingBooking(booking);
        } else {
            try {
                await updateBookingStatus(booking.id, newStatus);
                addNotification({ type: 'success', title: 'Status Updated', message: `Booking #${booking.id.slice(-6)} is now ${newStatus}.`, recipientId: 'admin' });
            } catch (e) {
                addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
            }
        }
    };

    const handleConfirmCancellation = async (reason: string) => {
        if (cancellingBooking) {
            try {
                await cancelBooking(cancellingBooking.id, reason);
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
            const mechanicMatch = selectedMechanicId === 'all' || booking.mechanic?.id === selectedMechanicId;
            const categoryMatch = selectedCategory === 'all' || svcs.some(s => s.category === selectedCategory);
            const statusMatch = selectedStatus === 'all' || booking.status === selectedStatus;
            const paymentMatch = paymentFilter === 'all' || (paymentFilter === 'paid' ? booking.isPaid : !booking.isPaid);
            const searchMatch = searchQuery === '' || 
                booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig, dateFilter, paymentFilter, bookingSequences]);

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

        const last30Days = bookings.filter(b => new Date(b.date) >= thirtyDaysAgo);
        const previous30Days = bookings.filter(b => {
            const date = new Date(b.date);
            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
        });

        const getBookingTotal = (b: (typeof bookings)[0]) => {
            if (b.totalAmount != null) return b.totalAmount;
            const svcs = b.services && b.services.length > 0 ? b.services : b.service ? [b.service] : [];
            return svcs.reduce((s, svc) => s + svc.price, 0);
        };
        const totalRevenue = bookings.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0);
        const pendingRevenue = bookings.filter(b => b.status === 'Completed' && !b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0);
        const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.filter(b => b.status === 'Completed' && b.isPaid).length : 0;

        const todayBookings = bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length;

        const trendCalc = (current: number, previous: number) => {
            if (previous === 0) return { value: 0, isPositive: current > 0 };
            const change = ((current - previous) / previous) * 100;
            return { value: Math.round(Math.abs(change)), isPositive: change >= 0 };
        };

        return {
            total: bookings.length,
            totalTrend: trendCalc(last30Days.length, previous30Days.length),
            upcoming: bookings.filter(b => b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress' || b.status === 'Reschedule Requested').length,
            completed: bookings.filter(b => b.status === 'Completed').length,
            completedTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed').length,
                previous30Days.filter(b => b.status === 'Completed').length
            ),
            cancelled: bookings.filter(b => b.status === 'Cancelled').length,
            totalRevenue,
            revenueTrend: trendCalc(
                last30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0),
                previous30Days.filter(b => b.status === 'Completed' && b.isPaid).reduce((sum, b) => sum + getBookingTotal(b), 0)
            ),
            pendingRevenue,
            avgBookingValue,
            todayBookings
        };
    }, [bookings]);

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
                {/* Header */}
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none">Manage Bookings</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="h-1 w-8 bg-primary rounded-full"></div>
                            <p className="text-gray-500 font-bold tracking-[0.3em] text-[9px]">Operations & Scheduling</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tooltip content="Delete all bookings from database">
                            <button
                                onClick={() => setShowDeleteAllConfirm(true)}
                                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-black tracking-widest text-xs border border-red-500/20 transition-all flex items-center gap-2 active:scale-95 animate-pulse"
                            >
                                <Trash2 size={16} />
                                Delete All
                            </button>
                        </Tooltip>
                        <Tooltip content="Export bookings to CSV file">
                            <button
                                onClick={exportToCSV}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black tracking-widest text-xs border border-white/5 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <Download size={16} />
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
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Customer or Service..."
                                    className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-3 py-1.5 text-white text-xs font-bold placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={selectedMechanicId}
                                    onChange={(e) => setSelectedMechanicId(e.target.value)}
                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-primary"
                                >
                                    <option value="all">All Mechanics</option>
                                    {mechanics.filter(m => m.status === 'Active').map(mechanic => (
                                        <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-primary"
                                >
                                    {bookingStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status === 'all' ? 'All Statuses' : status}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={paymentFilter}
                                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-primary"
                                >
                                    <option value="all">All Payments</option>
                                    <option value="paid">Paid Only</option>
                                    <option value="unpaid">Unpaid Only</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Filters & Presets */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black tracking-widest text-gray-500 mr-2">Quick Range:</span>
                                {['all', 'today', 'week', 'month'].map(preset => (
                                    <Tooltip key={preset} content={`Filter by ${preset === 'all' ? 'all dates' : preset}`}>
                                        <button
                                            onClick={() => handleDatePreset(preset)}
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${datePreset === preset
                                                ? 'bg-primary text-white shadow-lg'
                                                : 'bg-white/5 text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            {preset === 'all' ? 'All' : preset}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <input
                                    type="date"
                                    value={dateFilter.start}
                                    onChange={e => { setDateFilter(prev => ({ ...prev, start: e.target.value })); setDatePreset('custom'); }}
                                    className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-white font-bold outline-none focus:border-primary text-[10px]"
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="date"
                                    value={dateFilter.end}
                                    min={dateFilter.start}
                                    onChange={e => { setDateFilter(prev => ({ ...prev, end: e.target.value })); setDatePreset('custom'); }}
                                    className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-white font-bold outline-none focus:border-primary text-[10px]"
                                />
                            </div>

                            {activeFiltersCount > 0 && (
                                <Tooltip content="Remove all applied filters">
                                    <button
                                        onClick={clearAllFilters}
                                        className="px-4 py-1.5 bg-red-500/10 text-red-500 rounded-lg font-black tracking-widest text-[9px] hover:bg-red-500 hover:text-white transition-all ml-4"
                                    >
                                        Clear Filters ({activeFiltersCount})
                                    </button>
                                </Tooltip>
                            )}
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
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by ID">
                                        <button onClick={() => requestSort('id')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            ID {getSortIndicator('id')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by customer name">
                                        <button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            Customer {getSortIndicator('customerName')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">Service</th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px] hidden lg:table-cell">Vehicle</th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by mechanic name">
                                        <button onClick={() => requestSort('mechanicName')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            Mechanic {getSortIndicator('mechanicName')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <Tooltip content="Sort by date">
                                        <button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            Date {getSortIndicator('date')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px] text-right">
                                    <Tooltip content="Sort by price">
                                        <button onClick={() => requestSort('price')} className="flex items-center gap-2 hover:text-white ml-auto transition-colors group">
                                            Price {getSortIndicator('price')}
                                        </button>
                                    </Tooltip>
                                </th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">Payment</th>
                                <th className="py-2.5 px-3 font-black text-gray-500  tracking-[0.2em] text-[10px]">Status</th>
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
                                            <td className="py-2 px-3 text-[10px] font-black  tracking-widest text-gray-500 flex items-center gap-3">
                                                <Tooltip content={expandedBookingId === booking.id ? 'Collapse details' : 'Expand details'}>
                                                    <ChevronDown size={14} className={`transition-transform duration-300 ${expandedBookingId === booking.id ? 'rotate-180 text-primary' : 'text-gray-600'}`} />
                                                </Tooltip>
                                                <div className="flex items-center gap-1.5">
                                                    <span>{bookingSequences[booking.id] || booking.id}</span>
                                                    {(((booking.createdAt && (new Date().getTime() - new Date(booking.createdAt).getTime()) < 24 * 60 * 60 * 1000) || 
                                                      (!booking.createdAt && booking.date === new Date().toISOString().split('T')[0])) && 
                                                      booking.status !== 'Completed' && booking.status !== 'Cancelled') && (
                                                        <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse shrink-0">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
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
                                                            <span className="font-black text-white text-sm truncate" title={booking.customerName}>
                                                                {booking.customerName}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-2 px-3">
                                                {(() => {
                                                    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                    const names = svcs.map(s => s.name).join(', ') || 'Unknown Service';
                                                    const cats = [...new Set(svcs.map(s => s.category).filter(Boolean))].join(', ') || 'N/A';
                                                    return (
                                                        <div>
                                                            <p className="font-bold text-gray-300 text-sm">{names}</p>
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black  tracking-widest border border-blue-500/20">{cats}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-2 px-3 hidden lg:table-cell">
                                                <p className="text-xs font-bold text-gray-300">{booking.vehicle?.make || ''} {booking.vehicle?.model || 'N/A'}</p>
                                                <p className="text-[10px] text-gray-600 font-mono mt-0.5  tracking-widest">{booking.vehicle?.plateNumber || 'No Plate'}</p>
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
                                            <td className="py-2 px-3 whitespace-nowrap">
                                                <div>
                                                    <p className="font-bold text-white text-xs">{booking.date}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold  tracking-widest mt-0.5">{booking.time}</p>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-black text-green-400 text-sm">
                                                {(() => {
                                                    const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                    const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
                                                    return <>₱{total.toLocaleString()}</>;
                                                })()}
                                            </td>
                                            <td className="py-2 px-3">
                                                {(() => {
                                                    const isGcash = booking.paymentMethod === 'GCash';
                                                    const hasReceipt = !!booking.gcashReceiptUrl;
                                                    const isVerified = booking.isVerified;
                                                    const isDeclined = !!booking.gcashDeclineReason;
 
                                                    if (booking.isPaid) {
                                                        return (
                                                            <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-black tracking-widest border border-green-500/20 whitespace-nowrap">
                                                                Fully Paid
                                                            </span>
                                                        );
                                                    }
                                                    if (isGcash) {
                                                        if (isVerified) {
                                                            return (
                                                                <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-black tracking-widest border border-green-500/20 whitespace-nowrap">
                                                                    Deposit Confirmed (50%)
                                                                </span>
                                                            );
                                                        }
                                                        if (isDeclined) {
                                                            return (
                                                                <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black tracking-widest border border-red-500/20 whitespace-nowrap">
                                                                    Deposit Declined
                                                                </span>
                                                            );
                                                        }
                                                        if (hasReceipt) {
                                                            return (
                                                                <span className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-[10px] font-black tracking-widest border border-orange-500/20 animate-pulse whitespace-nowrap">
                                                                    Pending Approval (50%)
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-black tracking-widest border border-yellow-500/20 whitespace-nowrap">
                                                                Unpaid (GCash)
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-black tracking-widest border border-yellow-500/20 whitespace-nowrap">
                                                            Unpaid
                                                        </span>
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
                                                        <div className="space-y-4">
                                                            <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all group/card h-full">
                                                                <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <Users size={14} />
                                                                    </div>
                                                                    Customer Profile
                                                                </h4>
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/20">
                                                                            {booking.customerName.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-white font-black text-base leading-snug">{booking.customerName}</p>
                                                                            <p className="text-xs text-gray-500 font-bold">{db.customers.find(c => c.name === booking.customerName)?.phone || 'No phone'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5 space-y-1.5">
                                                                        <div className="flex justify-between items-center text-xs">
                                                                            <span className="text-gray-500 font-bold  tracking-widest">Vehicle</span>
                                                                            <span className="text-white font-black">{booking.vehicle?.year || ''} {booking.vehicle?.make || ''}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-xs">
                                                                            <span className="text-gray-500 font-bold  tracking-widest">Model</span>
                                                                            <span className="text-white font-black">{booking.vehicle?.model || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-gray-500 font-bold  tracking-widest text-[10px]">Plate Num</span>
                                                                            <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-md font-mono text-[10px] font-black border border-primary/20">{booking.vehicle?.plateNumber || 'N/A'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="pt-3 mt-auto border-t border-white/5">
                                                                        <h4 className="text-[10px] font-black  tracking-widest text-gray-600 mb-2 ml-1">Payment Status</h4>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
                                                                                <div>
                                                                                    {(() => {
                                                                                        const svcs = booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
                                                                                        const total = booking.totalAmount ?? svcs.reduce((s, svc) => s + svc.price, 0);
                                                                                        return <p className="text-lg font-black text-white">₱{total.toLocaleString()}</p>;
                                                                                    })()}
                                                                                    <p className="text-[9px] font-black text-gray-600  tracking-widest mt-0.5">
                                                                                        {booking.paymentMethod === 'GCash' ? `GCash (${booking.paymentStatus})` : 
                                                                                         booking.isPaid ? 'Payment Confirmed' : 'Awaiting Payment'}
                                                                                    </p>
                                                                                </div>
                                                                                {!booking.isPaid && booking.paymentMethod !== 'GCash' && (
                                                                                    <Tooltip content="Mark as fully paid">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleMarkPaid(booking.id); }}
                                                                                            className="p-2.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-50 hover:text-white transition-all border border-green-500/20"
                                                                                        >
                                                                                            <DollarSign size={16} />
                                                                                        </button>
                                                                                    </Tooltip>
                                                                                )}
                                                                                {booking.isPaid && <Tooltip content="Payment confirmed"><div className="p-2.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20"><CheckCircle size={16} /></div></Tooltip>}
                                                                            </div>
                                
                                                                            {booking.paymentMethod === 'GCash' && (booking.gcashReference || booking.gcashReceiptUrl) && !booking.isVerified && (
                                                                                <div className="p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/20 space-y-1.5">
                                                                                    <div className="flex justify-between items-center text-xs">
                                                                                        <span className="text-[10px] font-black tracking-widest text-blue-400">GCash Ref</span>
                                                                                        {booking.gcashReference && <span className="text-white font-mono font-black text-xs">{booking.gcashReference}</span>}
                                                                                    </div>
                                                                                    
                                                                                    {booking.gcashReceiptUrl && (
                                                                                        <div className="mt-1 rounded-lg border border-white/10 overflow-hidden bg-black/40">
                                                                                            <img 
                                                                                                src={booking.gcashReceiptUrl} 
                                                                                                alt="GCash Receipt" 
                                                                                                className="w-full h-auto max-h-32 object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                                                                                onClick={() => window.open(booking.gcashReceiptUrl, '_blank')}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                
                                                                                    <div className="flex flex-col gap-1.5 pt-1">
                                                                                        <Tooltip content="Verify GCash downpayment">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); verifyBookingPayment(booking.id); }}
                                                                                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black tracking-widest text-[9px] rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5"
                                                                                            >
                                                                                                <ShieldCheck size={12} /> Verify
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                        <Tooltip content="Open GCash payments portal">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); navigate('/admin-portal/gcash-payments'); }}
                                                                                                className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black tracking-widest text-[9px] border border-white/10 rounded-lg transition-all flex items-center justify-center gap-1.5"
                                                                                            >
                                                                                                <ExternalLink size={12} /> Portal
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {booking.paymentMethod === 'GCash' && booking.isVerified && (
                                                                                 <div className="p-2.5 bg-green-500/5 rounded-lg border border-green-500/20 flex flex-col gap-1.5">
                                                                                     <div className="flex items-center gap-2">
                                                                                         <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                                                                             <ShieldCheck size={12} />
                                                                                         </div>
                                                                                         <div>
                                                                                             <p className="text-[9px] font-black text-green-400  tracking-widest">GCash Verified</p>
                                                                                             <p className="text-xs text-white font-mono font-black">{booking.gcashReference || 'Verified'}</p>
                                                                                         </div>
                                                                                     </div>
                                                                                 </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                                        {/* SERVICE & MANAGEMENT CARD */}
                                                        <div className="space-y-4">
                                                            <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all h-full">
                                                                <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <Edit size={14} />
                                                                    </div>
                                                                    Service & Management
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-primary font-black text-sm">{booking.service?.name || 'Unknown Service'}</p>
                                                                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{booking.service?.description || 'No description.'}</p>
                                                                    </div>
                                 
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                                                            <Clock size={14} className="text-primary mx-auto mb-1.5" />
                                                                            <p className="text-[9px] font-black text-gray-500  tracking-widest">Duration</p>
                                                                            <p className="text-[11px] font-black text-white mt-0.5">{booking.service?.estimatedTime || 'N/A'}</p>
                                                                        </div>
                                                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                                                            <Calendar size={14} className="text-primary mx-auto mb-1.5" />
                                                                            <p className="text-[9px] font-black text-gray-500  tracking-widest">Scheduled</p>
                                                                            <p className="text-[11px] font-black text-white mt-0.5">{booking.date}</p>
                                                                        </div>
                                                                    </div>
                                 
                                                                    <div className="pt-2 border-t border-white/5">
                                                                        <h4 className="text-[9px] font-black  tracking-widest text-gray-600 mb-2 ml-1">Assigned Mechanic</h4>
                                                                        {booking.mechanic ? (
                                                                            <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/5">
                                                                                <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center text-sm font-black text-primary">
                                                                                    {booking.mechanic.name.charAt(0)}
                                                                                </div>
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
                                 
                                                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                                                        <h4 className="text-[9px] font-black  tracking-widest text-gray-600 ml-1">Update Status</h4>
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-1 relative group/select">
                                                                                <label className="absolute -top-2 left-3 px-1.5 bg-[#151515] text-[8px] font-black  tracking-widest text-gray-600 z-10">Select Status</label>
                                                                                <select
                                                                                    value={booking.status}
                                                                                    onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    className="w-full bg-white/5 border border-white/10 py-2 px-3 rounded-lg text-[10px] font-black  tracking-widest text-white hover:border-primary transition-all outline-none appearance-none cursor-pointer"
                                                                                >
                                                                                    {bookingStatuses.slice(1).map(s => <option key={s} value={s} className="bg-[#121212]">{s}</option>)}
                                                                                </select>
                                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover/select:text-primary transition-colors" size={14} />
                                                                            </div>
                                                                            {booking.status !== 'Cancelled' && (
                                                                                <Tooltip content="Cancel this booking">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setCancellingBooking(booking); }}
                                                                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20 font-black  tracking-widest text-[9px]"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </Tooltip>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                 
                                                        {/* TIMELINE CARD */}
                                                        <div className="space-y-4">
                                                            <div className="bg-[#151515] p-4 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all h-full overflow-hidden flex flex-col">
                                                                <h4 className="text-[11px] font-black  tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                        <Clock size={14} />
                                                                    </div>
                                                                    Progress Tracking
                                                                </h4>
                                                                <div className="flex-1 space-y-2 relative pl-3">
                                                                    <div className="absolute left-[19px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
                                                                    {booking.statusHistory && booking.statusHistory.length > 0 ? (
                                                                        booking.statusHistory.map((s, i) => (
                                                                            <div key={i} className="flex gap-3 relative group/step">
                                                                                <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black z-10 transition-all duration-300 ${i === booking.statusHistory!.length - 1 ? 'bg-primary text-white shadow-lg' : 'bg-[#202020] text-gray-600 border border-white/5'}`}>
                                                                                    {i + 1}
                                                                                </div>
                                                                                <div className="pt-0.5">
                                                                                    <p className={`text-xs font-black  tracking-widest transition-colors ${i === booking.statusHistory!.length - 1 ? 'text-white' : 'text-gray-600'}`}>{s.status}</p>
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
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                                    <Tooltip content="View full booking details">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setViewingBooking(booking); }}
                                                                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-black  tracking-widest text-[9px] rounded-lg border border-white/5 transition-all text-center flex items-center justify-center gap-1.5"
                                                                        >
                                                                            <Eye size={12} className="text-primary" /> Full JSON View
                                                                        </button>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        </div>
                                 
                                                        {/* LIVE MAP CARD */}
                                                        <div className="space-y-4">
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
                                                                    <div className="w-full h-full min-h-[130px] rounded-2xl bg-[#101010] relative overflow-hidden border border-white/5 group/map">
                                                                        {/* Simulated Map Background */}
                                                                        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                                                                            <div 
                                                                                className="absolute inset-0 bg-cover bg-center" 
                                                                                style={{ 
                                                                                    backgroundImage: "url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/121.05,14.58,12,0/800x600?access_token=" + 
                                                                                        "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ." + 
                                                                                        "0_vEybvOf6uclH6S3S3XJA')" 
                                                                                }}
                                                                            ></div>
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent"></div>
                                                                        </div>
                                 
                                                                        {/* Animated Tracking Pulse for Customer */}
                                                                        <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-20">
                                                                            <div className="relative">
                                                                                <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-25"></div>
                                                                                <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-[#101010] shadow-lg flex items-center justify-center text-white">
                                                                                    <Users size={10} fill="currentColor" />
                                                                                </div>
                                                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[8px] font-black text-white  tracking-wider">
                                                                                    Customer
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                 
                                                                        {/* Service Mechanic Position (Moving simulation) */}
                                                                        {booking.status === 'En Route' || booking.status === 'In Progress' ? (
                                                                            <div className="absolute top-[55%] left-[60%] -translate-x-1/2 -translate-y-1/2 z-20 animate-pulse transition-all">
                                                                                <div className="relative">
                                                                                    <div className="absolute inset-0 w-8 h-8 bg-primary rounded-full animate-ping opacity-20"></div>
                                                                                    <div className="w-8 h-8 bg-primary rounded-full border-2 border-[#101010] shadow-2xl flex items-center justify-center text-white rotate-12">
                                                                                        <div className="animate-bounce"><Search size={10} fill="currentColor" /></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px] bg-black/40">
                                                                                <div className="text-center p-4 space-y-2">
                                                                                    <Search size={18} className="text-gray-600 mx-auto" />
                                                                                    <p className="text-[9px] font-black text-white  tracking-widest">Tracking Offline</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 pt-0">
                                                                    <Tooltip content="View service location on map">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleViewMap(booking); }}
                                                                            className="w-full py-2.5 bg-primary text-white font-black  tracking-widest text-[9px] rounded-lg hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center gap-1.5"
                                                                        >
                                                                            Open Detailed Map
                                                                        </button>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        </div>
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
                                                <p className="font-black text-green-400 text-sm mt-0.5">₱{total.toLocaleString()}</p>
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
                                                        {booking.paymentMethod === 'GCash' && (booking.gcashReference || booking.gcashReceiptUrl) && !booking.isVerified && (
                                                            <div className="p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/20 space-y-2">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-blue-400 font-bold">GCash Ref:</span>
                                                                    <span className="text-white font-mono font-black">{booking.gcashReference || 'Pending'}</span>
                                                                </div>
                                                                {booking.gcashReceiptUrl && (
                                                                    <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                                        <img 
                                                                            src={booking.gcashReceiptUrl} 
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
                                                    <div>
                                                        <p className="text-primary font-black text-sm">{booking.service?.name || 'Unknown Service'}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">{booking.service?.estimatedTime || 'N/A'}</p>
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
                                                            <select
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
                                                    {booking.statusHistory && booking.statusHistory.length > 0 ? (
                                                        booking.statusHistory.map((s, i) => (
                                                            <div key={i} className="flex gap-3 relative">
                                                                <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black z-10 ${i === booking.statusHistory!.length - 1 ? 'bg-primary text-white' : 'bg-white/5 text-gray-500'}`}>
                                                                    {i + 1}
                                                                </div>
                                                                <div>
                                                                    <p className={`text-xs font-black ${i === booking.statusHistory!.length - 1 ? 'text-white' : 'text-gray-500'}`}>{s.status}</p>
                                                                    <p className="text-[8px] text-gray-600 font-bold mt-0.5">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-gray-600 font-bold pl-2 py-2">No history recorded yet.</p>
                                                    )}
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
