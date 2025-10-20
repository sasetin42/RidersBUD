import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

type SortableKeys = 'customerName' | 'date' | 'total' | 'status';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

const OrderDetailsModal: React.FC<{ order: Order; onClose: () => void; }> = ({ order, onClose }) => {
    return (
        <Modal title={`Order Details #${order.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-admin-bg p-3 rounded-lg">
                        <p className="text-xs text-admin-text-secondary">Customer</p>
                        <p className="font-semibold text-admin-text-primary">{order.customerName}</p>
                    </div>
                    <div className="bg-admin-bg p-3 rounded-lg">
                        <p className="text-xs text-admin-text-secondary">Order Date</p>
                        <p className="font-semibold text-admin-text-primary">{new Date(order.date).toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="bg-admin-bg p-3 rounded-lg">
                    <h3 className="font-bold text-admin-accent mb-2">Items Ordered ({order.items.reduce((acc, item) => acc + item.quantity, 0)})</h3>
                    <div className="space-y-3">
                        {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 border-b border-admin-border pb-3 last:pb-0 last:border-b-0">
                                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-md object-cover" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.name}</p>
                                    <p className="text-xs text-admin-text-secondary">
                                        {item.quantity} x ₱{item.price.toFixed(2)}
                                    </p>
                                </div>
                                <p className="font-semibold text-sm">₱{(item.quantity * item.price).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {order.statusHistory && order.statusHistory.length > 0 && (
                     <div className="bg-admin-bg p-4 rounded-lg">
                        <h3 className="font-bold text-admin-accent mb-4">Status History</h3>
                        <div className="relative pl-5">
                            <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-admin-border"></div>
                            <ul className="space-y-4">
                                {[...(order.statusHistory || [])].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s, i) => (
                                    <li key={i} className="text-sm flex items-start relative">
                                        <div className={`absolute left-[-1.1rem] top-1 w-4 h-4 rounded-full flex items-center justify-center ${i === 0 ? 'bg-admin-accent ring-4 ring-admin-accent/20' : 'bg-admin-border'}`}></div>
                                        <div className="flex justify-between w-full">
                                            <span className={`font-semibold ${i === 0 ? 'text-white' : 'text-admin-text-secondary'}`}>{s.status}</span>
                                            <span className={`text-xs ${i === 0 ? 'text-gray-300' : 'text-gray-500'}`}>{new Date(s.timestamp).toLocaleString()}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="bg-admin-bg p-4 rounded-lg text-right">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-admin-text-secondary">Payment Method:</span>
                        <span className="font-semibold text-admin-text-primary">{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl mt-2">
                        <span className="text-admin-text-secondary">Grand Total:</span>
                        <span className="font-bold text-admin-accent">₱{order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

const AdminOrdersScreen: React.FC = () => {
    const { db, updateOrderStatus, loading } = useDatabase();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    
    const orderStats = useMemo(() => {
        if (!db) return { total: 0, revenue: 0, avgValue: 0 };
        const revenue = db.orders.reduce((sum, o) => sum + o.total, 0);
        const total = db.orders.length;
        const avgValue = total > 0 ? revenue / total : 0;
        return { total, revenue, avgValue };
    }, [db]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const sortedAndFilteredOrders = useMemo(() => {
        if (!db) return [];
        let filtered = db.orders.filter(order => {
            const searchMatch = searchQuery === '' || order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.toLowerCase().includes(searchQuery.toLowerCase());
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            let dateMatch = true;
            if (dateFilter.start && dateFilter.end) {
                const startDate = new Date(dateFilter.start).getTime();
                const endDate = new Date(dateFilter.end).getTime() + 86400000; // include the whole end day
                const orderDate = new Date(order.date).getTime();
                dateMatch = orderDate >= startDate && orderDate < endDate;
            }
            return searchMatch && dateMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            if (sortConfig.key === 'date') {
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [db, searchQuery, dateFilter, statusFilter, sortConfig]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }
    
    const orderStatuses: Array<OrderStatus | 'all'> = ['all', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    const statusColors: Record<OrderStatus, string> = { Processing: 'bg-blue-500/20 text-blue-300', Shipped: 'bg-yellow-500/20 text-yellow-300', Delivered: 'bg-green-500/20 text-green-300', Cancelled: 'bg-red-500/20 text-red-300' };


    return (
        <div className="text-admin-text-primary flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 px-6 lg:px-8 pt-6">
                <h1 className="text-3xl font-bold">Parts Orders</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
                    <StatCard title="Total Orders" value={orderStats.total.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                    <StatCard title="Total Revenue" value={`₱${(orderStats.revenue/1000).toFixed(1)}k`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <StatCard title="Avg. Order Value" value={`₱${orderStats.avgValue.toFixed(2)}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 2v.01" /></svg>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Customer or Order ID..." className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg">
                        {orderStatuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
                    </select>
                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                    <input type="date" value={dateFilter.end} min={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                </div>
            </div>

            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-admin-bg z-10">
                        <tr>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Order ID</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white">Customer {getSortIndicator('customerName')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white">Date {getSortIndicator('date')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('status')} className="flex items-center gap-2 hover:text-white">Status {getSortIndicator('status')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border text-right"><button onClick={() => requestSort('total')} className="flex items-center gap-2 hover:text-white ml-auto">Total {getSortIndicator('total')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {sortedAndFilteredOrders.length > 0 ? sortedAndFilteredOrders.map((order) => (
                             <tr key={order.id} className="hover:bg-admin-card">
                                <td className="py-3 px-2 text-sm font-mono text-admin-text-secondary">#{order.id.toUpperCase().slice(-6)}</td>
                                <td className="py-3 px-2 text-sm">{order.customerName}</td>
                                <td className="py-3 px-2 text-xs">{new Date(order.date).toLocaleString()}</td>
                                <td className="py-3 px-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>{order.status}</span></td>
                                <td className="py-3 px-2 text-sm text-right font-semibold text-green-400">₱{order.total.toFixed(2)}</td>
                                <td className="py-3 px-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => setViewingOrder(order)} className="font-semibold text-blue-400 hover:text-blue-300 text-sm">View</button>
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)} 
                                            className="bg-admin-card border border-admin-border p-1 rounded text-xs"
                                            onClick={(e) => e.stopPropagation()} // Prevent row click
                                        >
                                            {orderStatuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className="text-center py-10 text-admin-text-secondary">No orders match the current filters.</td></tr>
                        )}
                    </tbody>
                </table>
                 {viewingOrder && (<OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />)}
            </div>
        </div>
    );
};

export default AdminOrdersScreen;