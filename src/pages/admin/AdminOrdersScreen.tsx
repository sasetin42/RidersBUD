import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Search, Filter, ShoppingBag, CreditCard, DollarSign, Package, CheckCircle, Clock, Truck, XCircle, ChevronDown, MoreVertical } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-white/5 relative overflow-hidden group">
        <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10 group-hover:rotate-12 transition-transform`}>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">{value}</p>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
    </div>
);

const OrderDetailsModal: React.FC<{ order: Order; onClose: () => void; }> = ({ order, onClose }) => {
    return (
        <Modal title={`Order #${order.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6 text-white min-w-[500px]">
                {/* Top Status Bar */}
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                    <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className={`font-bold text-lg ${order.status === 'Delivered' ? 'text-green-400' :
                                order.status === 'Cancelled' ? 'text-red-400' :
                                    'text-blue-400'
                            }`}>{order.status}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 text-right">Order Date</p>
                        <p className="font-bold text-lg">{new Date(order.date).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Items List */}
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h4 className="font-bold text-gray-300 flex items-center gap-2">
                            <ShoppingBag size={18} /> Items ({order.items.reduce((acc, item) => acc + item.quantity, 0)})
                        </h4>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 border border-white/10">
                                    <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold">{item.name}</p>
                                    <p className="text-xs text-gray-400">{item.quantity} x ₱{item.price.toLocaleString()}</p>
                                </div>
                                <p className="font-bold text-primary">₱{(item.quantity * item.price).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center">
                        <span className="text-gray-400">Total Amount</span>
                        <span className="text-2xl font-bold text-white">₱{order.total.toLocaleString()}</span>
                    </div>
                </div>

                {/* Payment & Customer */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Payment</h4>
                        <div className="flex items-center gap-2">
                            <CreditCard size={18} className="text-primary" />
                            <span className="font-bold">{order.paymentMethod}</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Customer</h4>
                        <p className="font-bold">{order.customerName}</p>
                    </div>
                </div>

                {/* Timeline */}
                {order.statusHistory && (
                    <div className="pt-2">
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Order History</h4>
                        <div className="space-y-4 pl-2 border-l-2 border-white/10 ml-2">
                            {order.statusHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s, i) => (
                                <div key={i} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${i === 0 ? 'bg-primary' : 'bg-gray-600'}`}></div>
                                    <p className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{s.status}</p>
                                    <p className="text-xs text-gray-600">{new Date(s.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminOrdersScreen: React.FC = () => {
    const { db, updateOrderStatus, loading } = useDatabase();
    const { addNotification } = useNotification();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    // Derived Data
    const orderStats = useMemo(() => {
        const revenue = db.orders.reduce((sum, o) => sum + o.total, 0);
        return {
            total: db.orders.length,
            revenue: revenue,
            avgValue: db.orders.length > 0 ? revenue / db.orders.length : 0,
            pending: db.orders.filter(o => o.status === 'Processing').length
        };
    }, [db.orders]);

    const filteredOrders = useMemo(() => {
        return db.orders.filter(order => {
            const searchMatch = searchQuery === '' ||
                order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.id.toLowerCase().includes(searchQuery.toLowerCase());
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            return searchMatch && statusMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [db.orders, searchQuery, statusFilter]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, orderId: string) => {
        e.stopPropagation();
        const newStatus = e.target.value as OrderStatus;
        try {
            await updateOrderStatus(orderId, newStatus);
            addNotification({ type: 'success', title: 'Status Updated', message: `Order #${orderId.slice(-6)} set to ${newStatus}.`, recipientId: 'all' });
        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'Failed to update order status.', recipientId: 'all' });
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            'Delivered': 'bg-green-500/10 text-green-400 border-green-500/20',
            'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/20',
            'Processing': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Shipped': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'} whitespace-nowrap`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header & Stats */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Parts Orders</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Orders" value={orderStats.total} icon={<Package size={24} />} color="bg-purple-500" />
                    <StatCard title="Total Revenue" value={`₱${(orderStats.revenue / 1000).toFixed(1)}k`} icon={<DollarSign size={24} />} color="bg-green-500" />
                    <StatCard title="Avg. Order Value" value={`₱${orderStats.avgValue.toFixed(0)}`} icon={<CreditCard size={24} />} color="bg-blue-500" />
                    <StatCard title="Processing" value={orderStats.pending} icon={<Clock size={24} />} color="bg-yellow-500" />
                </div>
            </div>

            {/* Main Table Card */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[600px]">
                {/* Toolbar */}
                <div className="p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-white/5">
                    <div className="relative group flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-600"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                        className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-4 py-2.5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400 font-medium">
                                <th className="p-5 pl-6">Order ID</th>
                                <th className="p-5">Customer</th>
                                <th className="p-5">Date</th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-right">Total</th>
                                <th className="p-5 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    onClick={() => setViewingOrder(order)}
                                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <td className="p-5 pl-6">
                                        <span className="font-mono text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                                    </td>
                                    <td className="p-5 font-bold text-white group-hover:text-primary transition-colors">
                                        {order.customerName}
                                    </td>
                                    <td className="p-5 text-gray-300">
                                        {new Date(order.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-5">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="p-5 text-right font-bold text-white">
                                        ₱{order.total.toLocaleString()}
                                    </td>
                                    <td className="p-5 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                                            <select
                                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(e, order.id)}
                                            >
                                                {['Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-500">
                                        No orders found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Description Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Truck size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-white">Order Management System</h3>
                    <p className="text-sm text-gray-400 mt-1">Manage customer orders, track payments, and update shipping statuses in real-time. Changes here are instantly reflected on the customer's end.</p>
                </div>
            </div>

            {viewingOrder && <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
        </div>
    );
};

export default AdminOrdersScreen;