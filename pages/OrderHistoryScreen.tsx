import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Order, OrderStatus } from '../types';
import { Package, Truck, CheckCircle, Clock, ChevronDown, ChevronUp, MapPin, CreditCard, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
    const styles = {
        'Processing': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Shipped': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Delivered': 'bg-green-500/10 text-green-400 border-green-500/20',
        'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/20'
    };

    const icons = {
        'Processing': <Clock size={12} />,
        'Shipped': <Truck size={12} />,
        'Delivered': <CheckCircle size={12} />,
        'Cancelled': <Package size={12} />
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5  tracking-wider ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
};

const OrderCard: React.FC<{ order: Order; isExpanded: boolean; onToggle: () => void; }> = ({ order, isExpanded, onToggle }) => {
    const navigate = useNavigate();

    // Mock functionality for Buy Again (redirects to store)
    const handleBuyAgain = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/customer-portal/parts-store');
    };

    return (
        <div className={`bg-[#1E1E1E] rounded-2xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-white/5'}`}>
            <div onClick={onToggle} className="p-5 cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#121212] flex items-center justify-center border border-white/10">
                            <Package size={18} className="text-gray-400" />
                        </div>
                        <div>
                            <p className="font-black text-white text-lg tracking-tight">Order #{order.id.slice(-6)}</p>
                            <p className="text-xs text-gray-500 font-medium">
                                {new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    <StatusBadge status={order.status} />
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-full border-2 border-[#1E1E1E] bg-[#252525] overflow-hidden flex items-center justify-center">
                                <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {order.items.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-[#1E1E1E] bg-[#252525] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                +{order.items.length - 3}
                            </div>
                        )}
                    </div>

                    <div className="text-right flex items-center gap-3">
                        <div>
                            <p className="text-[10px] text-gray-500  font-bold text-right mb-0.5">Total Amount</p>
                            <p className="text-xl font-black text-primary leading-none">₱{order.total.toLocaleString()}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-gray-500'}`}>
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-white/5 animate-slideDown">
                    <div className="p-5 space-y-6">
                        {/* Timeline */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <div className="relative pl-4 border-l border-white/10 space-y-6 my-2">
                                {order.statusHistory.slice().reverse().map((history, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${idx === 0 ? 'bg-primary border-primary' : 'bg-[#1E1E1E] border-gray-600'}`}></div>
                                        <p className={`text-xs font-bold ${idx === 0 ? 'text-white' : 'text-gray-500'}`}>{history.status}</p>
                                        <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                                            {new Date(history.timestamp).toLocaleDateString()} • {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Items */}
                        <div className="bg-[#121212] rounded-xl p-4 border border-white/5 space-y-4">
                            <h4 className="text-xs font-black text-gray-400  tracking-widest flex items-center gap-2">
                                <Package size={12} /> Items ({order.items.length})
                            </h4>
                            {order.items.map(item => (
                                <div key={item.id} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                                    <div className="w-12 h-12 bg-[#1E1E1E] rounded-lg p-1 flex items-center justify-center border border-white/5">
                                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-contain mix-blend-normal" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-sm font-bold text-white line-clamp-1">{item.name}</p>
                                        <p className="text-xs text-gray-500">Qty: {item.quantity} × ₱{(item.salesPrice || item.price).toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm font-bold text-white">₱{((item.salesPrice || item.price) * item.quantity).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        {/* Payment & Shipping Mock */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#121212] rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] text-gray-500 font-bold  mb-1 flex items-center gap-1">
                                    <CreditCard size={10} /> Payment
                                </p>
                                <p className="text-xs font-bold text-white">{order.paymentMethod || 'Cash on Delivery'}</p>
                            </div>
                            <div className="bg-[#121212] rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] text-gray-500 font-bold  mb-1 flex items-center gap-1">
                                    <MapPin size={10} /> Delivery
                                </p>
                                <p className="text-xs font-bold text-white line-clamp-1">Standard Delivery</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleBuyAgain}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-colors border border-white/10"
                            >
                                <Repeat size={14} /> Buy Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const OrderHistoryScreen: React.FC = () => {
    const { user } = useAuth();
    const { db, loading } = useDatabase();
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const userOrders = useMemo(() => {
        if (!user || !db) return [];
        return db.orders
            .filter(order => order.customerName === user.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, db]);

    const handleToggle = (orderId: string) => {
        setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#121212]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            <Header title="Order History" showBackButton icon={<Package size={22} />} />
            <main className="flex-grow overflow-y-auto p-6 space-y-6 pb-20">
                {userOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
                        <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-2 animate-pulse">
                            <Package size={48} className="text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">No Orders Yet</h2>
                            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Your purchase history will appear here once you place your first order.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white tracking-wide">My Orders</h2>
                            <span className="text-xs font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-full">{userOrders.length} Total</span>
                        </div>
                        <div className="space-y-4">
                            {userOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    isExpanded={expandedOrderId === order.id}
                                    onToggle={() => handleToggle(order.id)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default OrderHistoryScreen;
