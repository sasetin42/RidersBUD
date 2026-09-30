import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { ShoppingCart, DollarSign, TrendingUp, Package, Download, Eye, Search, X, ChevronDown, ArrowUpDown, MapPin, User, Mail, Phone, Calendar, CheckCircle, AlertCircle, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import Tooltip from '../../components/ui/Tooltip';

type SortableKeys = 'customerName' | 'date' | 'total' | 'status';

interface PaymentApprovalModalProps {
    order: Order;
    orderNumber: string;
    onClose: () => void;
    onStatusUpdated: () => void;
}

const PaymentApprovalModal: React.FC<PaymentApprovalModalProps> = ({ order, orderNumber, onClose, onStatusUpdated }) => {
    const { addNotification } = useNotification();
    const [declineReason, setDeclineReason] = useState('');
    const [showDeclineInput, setShowDeclineInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), {
                isVerified: true,
                gcashDeclineReason: null,
                gcashPaymentStatus: 'verified',
                paymentStatus: 'paid',
                isPaid: true,
                status: order.status === 'Pending' ? 'Processing' : (order.status || 'Processing')
            });
            
            await addNotification({
                recipientId: `customer-${order.customerId || ''}`,
                title: '✅ Payment Verified',
                message: `Your payment for order ${orderNumber} has been approved and is now being processed.`,
                type: 'success',
                date: new Date().toISOString(),
                read: false,
                link: '/customer-portal/order-history'
            });

            addNotification({
                type: 'success',
                title: 'Payment Approved',
                message: `GCash payment for ${order.customerName} was successfully verified.`,
                recipientId: 'admin'
            });
            onStatusUpdated();
            onClose();
        } catch (e) {
            addNotification({ type: 'error', title: 'Approval Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!declineReason.trim()) {
            addNotification({ type: 'error', title: 'Reason Required', message: 'Please provide a reason for declining the payment.', recipientId: 'admin' });
            return;
        }
        setProcessing(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), {
                isVerified: false,
                gcashDeclineReason: declineReason,
                gcashPaymentStatus: 'declined',
                paymentStatus: 'pending',
                isPaid: false
            });

            await addNotification({
                recipientId: `customer-${order.customerId || ''}`,
                title: '❌ Payment Declined',
                message: `Your payment for order ${orderNumber} was declined. Reason: ${declineReason}`,
                type: 'alert',
                date: new Date().toISOString(),
                read: false,
                link: '/customer-portal/order-history'
            });

            toast.success("Payment Declined");
            onStatusUpdated();
            onClose();
        } catch (e) {
            addNotification({ type: 'error', title: 'Decline Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    const receiptUrl = order.gcashReceiptUrl || order.receiptUrl;

    return (
        <Modal title="Verify GCash Payment" isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Transaction Amount</p>
                        <p className="text-2xl font-black text-primary">₱{(order.total || 0).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Payment Status</p>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                            order.gcashPaymentStatus === 'verified' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                            order.gcashPaymentStatus === 'declined' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                            {order.gcashPaymentStatus || 'Awaiting verification'}
                        </span>
                    </div>
                </div>

                {receiptUrl ? (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400">Uploaded Receipt Screenshot</p>
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[9/16] max-h-[400px] flex justify-center items-center">
                            <img 
                                src={receiptUrl} 
                                alt="GCash Receipt" 
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <AlertCircle className="text-gray-500 mb-2" size={32} />
                        <p className="text-sm font-bold text-gray-400">No Receipt Uploaded Yet</p>
                        <p className="text-xs text-gray-600 mt-1">The customer has not uploaded a proof of payment.</p>
                    </div>
                )}

                {showDeclineInput ? (
                    <div className="space-y-3 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                        <label htmlFor="order-decline-reason" className="text-xs font-bold text-red-400 block">Decline Reason</label>
                        <textarea
                            id="order-decline-reason"
                            name="order-decline-reason"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Enter the reason for rejection (e.g. Reference number mismatch, Blur screenshot)..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500"
                            rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowDeclineInput(false)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={processing}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                                {processing ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                        <button
                            onClick={() => setShowDeclineInput(true)}
                            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all border border-red-500/20"
                        >
                            Decline Receipt
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={processing}
                            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2"
                        >
                            {processing ? 'Processing...' : 'Approve & Verify'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const OrderDetailsModal: React.FC<{ order: Order; orderNumber: string; onClose: () => void; }> = ({ order, orderNumber, onClose }) => {
    const { db } = useDatabase();
    const [showApprovalModal, setShowApprovalModal] = useState(false);

    // Dynamically retrieve customer profile picture
    const customerObj = useMemo(() => {
        if (!db?.customers) return null;
        return db.customers.find(c => c.id === order.customerId || (c.name || '').toLowerCase() === (order.customerName || '').toLowerCase());
    }, [db, order]);

    const customerPic = customerObj?.picture || customerObj?.avatarUrl;

    const subtotal = (order.items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
    const deliveryFee = (order.total || 0) - subtotal > 0 ? (order.total || 0) - subtotal : 0;
    const receiptUrl = order.gcashReceiptUrl || order.receiptUrl;

    return (
        <Modal title={`Order Details ${orderNumber}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                {/* Modern LIST stack layout */}
                <div className="flex flex-col gap-5">
                    
                    {/* Item 1: Customer Profile Details */}
                    <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 flex flex-col md:flex-row gap-5 items-start">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-orange-500 to-amber-600 flex-shrink-0 flex items-center justify-center text-white font-black overflow-hidden border border-white/10">
                            {customerPic ? (
                                <img src={customerPic} alt={order.customerName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">{order.customerName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{order.customerName}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">ID: {order.customerId || 'Guest/Walk-in'}</p>
                                </div>
                                <span className="text-[10px] text-gray-600 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 font-mono">
                                    {new Date(order.date).toLocaleString()}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <User size={14} className="text-primary" />
                                    <span className="truncate">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Mail size={14} className="text-primary" />
                                    <span className="truncate">{customerObj?.email || 'No Email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Phone size={14} className="text-primary" />
                                    <span>{customerObj?.phone || 'No Phone'}</span>
                                </div>
                            </div>

                            {order.shippingAddress && (
                                <div className="flex items-start gap-2 text-xs text-gray-400 pt-2">
                                    <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                                    <span>
                                        {typeof order.shippingAddress === 'object'
                                            ? `${order.shippingAddress.fullName || order.customerName || ''} - ${order.shippingAddress.addressLine1 || ''}, ${order.shippingAddress.city || ''} ${order.shippingAddress.zipCode || ''} (Tel: ${order.shippingAddress.phone || ''})`
                                            : order.shippingAddress}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Item 2: Items Ordered */}
                    <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Package size={18} className="text-primary" />
                                Items Ordered
                            </h3>
                            <span className="text-xs text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                {(order.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0)} Units
                            </span>
                        </div>
                        <div className="space-y-3">
                            {(order.items || []).map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5 hover:border-primary/20 transition-all">
                                    {item.imageUrls && item.imageUrls.length > 0 ? (
                                        <img src={item.imageUrls[0]} alt={item.name} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                            <Package size={24} className="text-gray-700" />
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-white truncate">{item.name || 'Unknown Item'}</p>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                            <span>Price: ₱{(item.price || 0).toLocaleString()}</span>
                                            <span>•</span>
                                            <span>Qty: {(item.quantity || 0)}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-lg">₱{((item.quantity || 0) * (item.price || 0)).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Item 3: Payment Verification & Receipt */}
                    <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-white/5">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-primary" />
                                    Payment Method: <span className="text-primary">{order.paymentMethod || 'GCash'}</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Verify and approve manual transactions.</p>
                            </div>
                            {order.paymentMethod === 'GCash' && (
                                <button
                                    onClick={() => setShowApprovalModal(true)}
                                    className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-black tracking-wider uppercase transition-all"
                                >
                                    Verify Payment
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Receipt Image Thumbnail */}
                            {receiptUrl ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">GCash Receipt Image</p>
                                    <div 
                                        onClick={() => setShowApprovalModal(true)}
                                        className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex justify-center items-center cursor-pointer hover:border-primary/40 transition-all"
                                    >
                                        <img 
                                            src={receiptUrl} 
                                            alt="GCash Receipt" 
                                            className="max-w-full max-h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                            <span className="text-xs text-white font-bold flex items-center gap-1.5">
                                                <Eye size={14} /> View Receipt
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 bg-black/20 rounded-xl border border-dashed border-white/5">
                                    <AlertCircle className="text-gray-600 mb-1" size={24} />
                                    <p className="text-xs text-gray-500">No payment receipt attached</p>
                                </div>
                            )}

                            {/* Payment Status Summary */}
                            <div className="space-y-3 flex flex-col justify-center bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">Payment Status</span>
                                    <span className={`font-bold ${order.isPaid ? 'text-green-400' : 'text-orange-400'}`}>
                                        {order.paymentStatus || (order.isPaid ? 'Paid' : 'Pending')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">GCash Status</span>
                                    <span className={`font-bold ${
                                        order.gcashPaymentStatus === 'verified' ? 'text-green-400' :
                                        order.gcashPaymentStatus === 'declined' ? 'text-red-400' : 'text-orange-400'
                                    }`}>
                                        {order.gcashPaymentStatus || 'Awaiting'}
                                    </span>
                                </div>
                                {order.gcashDeclineReason && (
                                    <div className="pt-2 border-t border-white/5">
                                        <p className="text-[10px] text-red-400 font-bold">Decline Reason:</p>
                                        <p className="text-[10px] text-gray-400 italic mt-0.5">{order.gcashDeclineReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Item 4: Status History Timeline */}
                    <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-primary" />
                            Timeline & History
                        </h3>
                        {order.statusHistory && order.statusHistory.length > 0 ? (
                            <div className="relative pl-4 border-l-2 border-white/10 ml-2 space-y-4">
                                {[...(order.statusHistory || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s, i) => (
                                    <div key={i} className="relative">
                                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-[#121212] ${i === 0 ? 'bg-primary' : 'bg-gray-600'}`}></div>
                                        <div>
                                            <p className={`text-xs font-bold ${i === 0 ? 'text-white' : 'text-gray-400'}`}>{s.status}</p>
                                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(s.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-xs italic">No timeline entries found.</p>
                        )}
                    </div>

                    {/* Item 5: Financials summary */}
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-[1.5rem] border border-primary/20">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="text-white font-bold">₱{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">Delivery Fee</span>
                                <span className="text-white font-bold">{deliveryFee > 0 ? `₱${deliveryFee.toLocaleString()}` : 'Free'}</span>
                            </div>
                            <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
                                <span className="text-gray-300 font-bold text-sm">Grand Total</span>
                                <span className="font-black text-primary text-3xl">₱{(order.total || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {showApprovalModal && (
                <PaymentApprovalModal 
                    order={order} 
                    orderNumber={orderNumber}
                    onClose={() => setShowApprovalModal(false)} 
                    onStatusUpdated={() => {
                        // Refresh properties on current viewing order in modal
                        order.isPaid = true;
                        order.paymentStatus = 'paid';
                        order.gcashPaymentStatus = 'verified';
                    }}
                />
            )}
        </Modal>
    );
};

const AdminOrdersScreen: React.FC = () => {
    const { db, updateOrderStatus, loading, deleteAllOrders, deleteOrder } = useDatabase();
    const { addNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [datePreset, setDatePreset] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'ascending' });
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleDeleteAllOrders = async () => {
        setIsDeletingAll(true);
        try {
            await deleteAllOrders();
            setShowDeleteAllConfirm(false);
            toast.success('All order records have been successfully deleted.');
        } catch (err) {
            console.error("Failed to delete orders", err);
            addNotification({
                type: 'error',
                title: 'Purge Failed',
                message: 'Failed to delete orders. Please try again.',
                recipientId: 'admin'
            });
        } finally {
            setIsDeletingAll(false);
        }
    };

    const orderSequences = useMemo(() => {
        if (!db?.orders) return {};
        const sortedOrders = [...db.orders].sort((a, b) => {
            const parseDate = (d: string) => {
                if (!d) return 0;
                const cleaned = d.replace(/-/g, '/');
                const parsed = new Date(cleaned).getTime();
                return isNaN(parsed) ? 0 : parsed;
            };
            const timeA = parseDate(a.date);
            const timeB = parseDate(b.date);
            if (timeA !== timeB) return timeA - timeB;
            return a.id.localeCompare(b.id);
        });

        const mapping: Record<string, string> = {};
        sortedOrders.forEach((ord, index) => {
            mapping[ord.id] = `RB-Orders-${String(index + 1).padStart(4, '0')}`;
        });
        return mapping;
    }, [db?.orders]);

    const toggleRow = (id: string) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    const handleDatePreset = (preset: string) => {
        setDatePreset(preset);
        const end = new Date();
        let start = new Date();

        switch (preset) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            default:
                setDateFilter({ start: '', end: '' });
                return;
        }
        setDateFilter({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const orderStats = useMemo(() => {
        if (!db) return { total: 0, revenue: 0, avgValue: 0, processing: 0 };
        const revenue = db.orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const total = db.orders.length;
        const avgValue = total > 0 ? revenue / total : 0;
        const processing = db.orders.filter(o => o.status === 'Processing').length;
        return { total, revenue, avgValue, processing };
    }, [db]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600 ml-1" />;
        return sortConfig.direction === 'ascending' ? <ChevronDown size={14} className="text-primary rotate-180 ml-1" /> : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const sortedAndFilteredOrders = useMemo(() => {
        if (!db) return [];
        let filtered = db.orders.filter(order => {
            const seqId = orderSequences[order.id] || '';
            const searchMatch = searchQuery === '' || 
                (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                (order.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                seqId.toLowerCase().includes(searchQuery.toLowerCase());
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            let dateMatch = true;
            if (dateFilter.start && dateFilter.end) {
                const startDate = new Date(dateFilter.start).getTime();
                const endDate = new Date(dateFilter.end).getTime() + 86400000;
                const orderDate = new Date(order.date).getTime();
                dateMatch = orderDate >= startDate && orderDate < endDate;
            }
            return searchMatch && dateMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let aValue: number;
            let bValue: number;

            if (sortConfig.key === 'date') {
                const parseDate = (d: any) => {
                    if (!d) return 0;
                    if (typeof d === 'number') return d;
                    const parsed = new Date(d).getTime();
                    if (!isNaN(parsed)) return parsed;
                    const cleaned = String(d).replace(/-/g, '/');
                    const fallback = new Date(cleaned).getTime();
                    return isNaN(fallback) ? 0 : fallback;
                };
                aValue = parseDate(a.date);
                bValue = parseDate(b.date);
            } else if (sortConfig.key === 'total') {
                aValue = Number(a.total) || 0;
                bValue = Number(b.total) || 0;
            } else {
                const aStr = String(a[sortConfig.key] || '');
                const bStr = String(b[sortConfig.key] || '');
                const cmp = aStr.localeCompare(bStr);
                return sortConfig.direction === 'ascending' ? cmp : -cmp;
            }

            if (aValue !== bValue) {
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            // Stable deterministic tie-breaker: order ID
            return a.id.localeCompare(b.id);
        });
        return filtered;
    }, [db, searchQuery, dateFilter, statusFilter, sortConfig, orderSequences]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        try {
            await updateOrderStatus(orderId, status);
            toast.success(`Order #${orderId.slice(-6)} status set to ${status}.`);
        } catch (e) {
            addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const handleDirectApprovePayment = async (order: Order) => {
        try {
            await updateDoc(doc(firestore, 'orders', order.id), {
                isVerified: true,
                gcashDeclineReason: null,
                gcashPaymentStatus: 'verified',
                paymentStatus: 'paid',
                isPaid: true,
                status: order.status === 'Pending' ? 'Processing' : (order.status || 'Processing')
            });
            
            await addNotification({
                recipientId: `customer-${order.customerId || ''}`,
                title: '✅ Payment Verified',
                message: `Your payment for order #${order.id.slice(-6).toUpperCase()} has been approved and is now being processed.`,
                type: 'success',
                date: new Date().toISOString(),
                read: false,
                link: '/customer-portal/order-history'
            });

            addNotification({
                type: 'success',
                title: 'Payment Approved',
                message: `GCash payment for ${order.customerName} was successfully verified.`,
                recipientId: 'admin'
            });
        } catch (e) {
            addNotification({ type: 'error', title: 'Approval Failed', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const orderStatuses: Array<OrderStatus | 'all'> = ['all', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    const statusColors: Record<OrderStatus, string> = {
        Processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        Shipped: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        Delivered: 'bg-green-500/20 text-green-300 border-green-500/30',
        Cancelled: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    const exportToCSV = () => {
        const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Items', 'Total'];
        const rows = sortedAndFilteredOrders.map(o => [
            orderSequences[o.id] || o.id,
            o.customerName,
            new Date(o.date).toLocaleString(),
            o.status,
            o.items.reduce((acc, item) => acc + item.quantity, 0),
            o.total
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDateFilter({ start: '', end: '' });
        setStatusFilter('all');
    };

    const activeFiltersCount = (searchQuery ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (dateFilter.start && dateFilter.end ? 1 : 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Parts Orders</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px]">Logistics & Sales</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Tooltip content="Delete all orders from database">
                        <button
                            onClick={() => setShowDeleteAllConfirm(true)}
                            className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-[1.5rem] font-black tracking-widest text-[10px] border border-red-500/20 transition-all flex items-center gap-3 active:scale-95 animate-pulse"
                        >
                            <Trash2 size={18} />
                            Delete All
                        </button>
                    </Tooltip>
                    <Tooltip content="Export orders to CSV file">
                        <button
                            onClick={exportToCSV}
                            className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard
                    title="Total Orders"
                    value={orderStats.total}
                    icon={<ShoppingCart size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    trend={{ value: 18, isPositive: true }}
                    subtitle="All time"
                />
                <EnhancedKPICard
                    title="Total Revenue"
                    value={`₱${(orderStats.revenue / 1000).toFixed(1)}k`}
                    icon={<DollarSign size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-800"
                    trend={{ value: 25, isPositive: true }}
                    subtitle="From orders"
                />
                <EnhancedKPICard
                    title="Avg. Order Value"
                    value={`₱${orderStats.avgValue.toLocaleString()}`}
                    icon={<TrendingUp size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Per order"
                />
                <EnhancedKPICard
                    title="Processing"
                    value={orderStats.processing}
                    icon={<Package size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                    subtitle="Pending orders"
                />
            </div>

            {/* Compact Filters */}
            <div className="relative group mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-[2rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="relative bg-[#121212]/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by order ID or customer..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium placeholder-gray-600 outline-none transition-all focus:border-primary/50 focus:bg-white/10"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10"
                        >
                            {orderStatuses.map(s => <option key={s} value={s} className="bg-[#121212]">{s === 'all' ? 'All Status' : s}</option>)}
                        </select>
                        {['all', 'today', 'week', 'month'].map(preset => (
                            <button
                                key={preset}
                                onClick={() => handleDatePreset(preset)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all ${datePreset === preset ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                            >
                                {preset === 'all' ? 'All' : preset}
                            </button>
                        ))}
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={e => { setDateFilter(prev => ({ ...prev, start: e.target.value })); setDatePreset('custom'); }}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary/50"
                        />
                        <span className="text-gray-500 text-xs">-</span>
                        <input
                            type="date"
                            value={dateFilter.end}
                            min={dateFilter.start}
                            onChange={e => { setDateFilter(prev => ({ ...prev, end: e.target.value })); setDatePreset('custom'); }}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary/50"
                        />
                        {/* Sort Controls */}
                        <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl p-1">
                            <select
                                value={sortConfig.key}
                                onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value as SortableKeys }))}
                                className="bg-transparent text-white text-xs font-semibold px-2 py-1 outline-none cursor-pointer"
                                title="Sort by attribute"
                            >
                                <option value="date" className="bg-[#121212]">Date</option>
                                <option value="total" className="bg-[#121212]">Total</option>
                                <option value="customerName" className="bg-[#121212]">Customer</option>
                                <option value="status" className="bg-[#121212]">Status</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => setSortConfig(prev => ({
                                    ...prev,
                                    direction: prev.direction === 'ascending' ? 'descending' : 'ascending'
                                }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                    sortConfig.direction === 'ascending'
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'bg-white/10 text-white'
                                }`}
                                title={`Currently: ${sortConfig.direction}. Click to toggle.`}
                            >
                                <ArrowUpDown size={12} />
                                <span>{sortConfig.direction === 'ascending' ? 'Asc (Oldest)' : 'Desc (Newest)'}</span>
                            </button>
                        </div>

                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                            >
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* List Layout */}
            <div className="space-y-3">
                {sortedAndFilteredOrders.length > 0 ? (
                    sortedAndFilteredOrders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
                        
                        // Retrieve customer info
                        const customerObj = db.customers.find(c => c.id === order.customerId || (c.name || '').toLowerCase() === (order.customerName || '').toLowerCase());
                        const customerPic = customerObj?.picture || customerObj?.avatarUrl;
                        const receiptUrl = order.gcashReceiptUrl || order.receiptUrl;

                        return (
                            <div key={order.id} className={`group relative bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all duration-200 hover:border-primary/40 ${isExpanded ? 'border-primary/60 ring-1 ring-primary/30' : 'border-white/10'}`}>
                                
                                {/* Row Header */}
                                <div onClick={() => toggleRow(order.id)} className="p-4 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    
                                    {/* Left: Expand, Order ID, Date */}
                                    <div className="flex items-center gap-3 min-w-[200px]">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-primary text-white' : 'bg-white/5 text-gray-400'}`}>
                                            <ChevronDown size={14} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white">{orderSequences[order.id] || order.id}</span>
                                                {order.date && order.status !== 'Delivered' && order.status !== 'Cancelled' && (new Date().getTime() - new Date(order.date).getTime()) < 24 * 60 * 60 * 1000 && (
                                                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                                                        New
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>

                                    {/* Middle Left: Customer Profile Live */}
                                    <div className="flex items-center gap-3 min-w-[220px]">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex-shrink-0 flex items-center justify-center text-sm font-black text-white overflow-hidden border border-white/10">
                                            {customerPic ? (
                                                <img src={customerPic} alt={order.customerName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{order.customerName.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{order.customerName}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{customerObj?.email || 'Guest User'}</p>
                                        </div>
                                    </div>

                                    {/* Middle Right: Order Image Uploaded / Receipt Thumbnail & Products */}
                                    <div className="flex items-center gap-4 flex-1">
                                        
                                        {/* GCash Receipt Image Live */}
                                        {order.paymentMethod === 'GCash' ? (
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }}
                                                className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5 hover:border-primary/40 transition-all cursor-pointer"
                                            >
                                                <div className="w-8 h-8 rounded bg-[#121212] overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                                    {receiptUrl ? (
                                                        <img src={receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <AlertCircle size={14} className="text-gray-600" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">GCash Receipt</p>
                                                    <span className={`text-[10px] font-bold ${
                                                        order.gcashPaymentStatus === 'verified' ? 'text-green-400' :
                                                        order.gcashPaymentStatus === 'declined' ? 'text-red-400' : 'text-orange-400'
                                                    }`}>
                                                        {order.gcashPaymentStatus || 'Awaiting'}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 text-left">
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</p>
                                                <span className="text-[10px] font-bold text-gray-300">{order.paymentMethod || 'COD'}</span>
                                            </div>
                                        )}

                                        {/* Products Preview Thumbnails */}
                                        <div className="hidden sm:flex items-center gap-1.5 overflow-hidden max-w-[200px]">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="w-8 h-8 rounded-lg bg-[#222] overflow-hidden border border-white/10 shrink-0 relative group/thumb">
                                                    {item.imageUrls?.[0] ? (
                                                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-white/5"><Package size={12} className="text-gray-600" /></div>
                                                    )}
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-[9px] font-bold text-gray-400 shrink-0">
                                                    +{order.items.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Items, Total and Action button */}
                                    <div className="flex items-center justify-between lg:justify-end gap-6 min-w-[200px] pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                                        <div className="text-left lg:text-right">
                                            <p className="text-[9px] text-gray-500 font-medium">Grand Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})</p>
                                            <p className="text-base font-black text-green-400">₱{order.total.toLocaleString()}</p>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }}
                                            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                        >
                                            <Eye size={12} /> Details
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 bg-[#17171a] p-5 space-y-4 animate-fadeIn">
                                        
                                        {/* Products details list */}
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Ordered Products</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                                                            {item.imageUrls?.[0] ? (
                                                                <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={16} className="text-gray-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium">{item.quantity} x ₱{item.price.toLocaleString()}</p>
                                                        </div>
                                                        <p className="text-xs font-black text-primary">₱{(item.quantity * item.price).toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status and Action Buttons */}
                                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pt-3 border-t border-white/5">
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Update Status</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {orderStatuses.filter(s => s !== 'all').map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, s as OrderStatus); }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${order.status === s ? statusColors[s] : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {order.paymentMethod === 'GCash' && (
                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (order.gcashPaymentStatus !== 'verified') {
                                                            handleDirectApprovePayment(order);
                                                        }
                                                    }}
                                                    disabled={order.gcashPaymentStatus === 'verified'}
                                                    className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 border ${
                                                        order.gcashPaymentStatus === 'verified'
                                                            ? 'bg-green-500/10 text-green-400 border-green-500/20 cursor-default'
                                                            : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 cursor-pointer'
                                                    }`}
                                                >
                                                    <ShieldCheck size={14} />
                                                    {order.gcashPaymentStatus === 'verified' ? 'Approved GCash Receipt' : 'Approve GCash Receipt'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
                        <Package size={32} className="text-gray-600 mb-3" />
                        <p className="text-sm font-medium text-gray-400">No orders found</p>
                        <p className="text-[10px] text-gray-600 mt-1">Try adjusting your filters</p>
                    </div>
                )}
            </div>

            {viewingOrder && (
                <OrderDetailsModal 
                    order={viewingOrder} 
                    orderNumber={orderSequences[viewingOrder.id] || viewingOrder.id}
                    onClose={() => setViewingOrder(null)} 
                />
            )}
            {showDeleteAllConfirm && (
                <Modal title="Delete All Orders" isOpen={true} onClose={() => setShowDeleteAllConfirm(false)}>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex gap-3">
                            <XCircle className="flex-shrink-0 mt-0.5 text-red-400" />
                            <div>
                                <h4 className="font-bold text-sm text-white">Critical Warning</h4>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    This operation will permanently delete <strong>all order records</strong>, transaction logs, and associated details from the database. This action is irreversible.
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
                                onClick={handleDeleteAllOrders}
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

export default AdminOrdersScreen;
