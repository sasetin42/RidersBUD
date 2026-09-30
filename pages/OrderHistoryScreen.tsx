import React, { useState, useMemo } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Order, OrderStatus } from '../types';
import { 
    Package, Truck, CheckCircle, Clock, ChevronDown, 
    ChevronUp, MapPin, CreditCard, Repeat, Search, 
    Filter, AlertCircle, ShoppingBag, DollarSign, MessageCircle,
    Navigation
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LiveRouteMapModal from '../components/LiveRouteMapModal';
import { geocodeAddressOrCity, resolveOrderTrackingLocations } from '../utils/locationHelper';

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
    const styles = {
        'Processing': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Shipped': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Delivered': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/20'
    };

    const icons = {
        'Processing': <Clock size={11} className="animate-spin duration-1000" />,
        'Shipped': <Truck size={11} />,
        'Delivered': <CheckCircle size={11} />,
        'Cancelled': <AlertCircle size={11} />
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border flex items-center gap-1.5 tracking-wider uppercase ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
};

const OrderCard: React.FC<{ 
    order: Order; 
    isExpanded: boolean; 
    onToggle: () => void;
    onTrack: (order: Order) => void;
}> = ({ order, isExpanded, onToggle, onTrack }) => {
    const navigate = useNavigate();

    const handleBuyAgain = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/customer-portal/parts-store');
    };

    const handleContactSupport = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/customer-portal/support-chat');
    };

    const handleTrackOrder = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTrack(order);
    };

    // Calculate dynamic delivery progress index
    const progressIndex = useMemo(() => {
        switch (order.status) {
            case 'Processing': return 1;
            case 'Shipped': return 2;
            case 'Delivered': return 3;
            default: return 0;
        }
    }, [order.status]);

    return (
        <div className={`bg-[#15151A]/85 backdrop-blur-xl rounded-2xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-primary/45 shadow-xl shadow-primary/5' : 'border-white/5'}`}>
            <div onClick={onToggle} className="p-5 cursor-pointer hover:bg-white/[0.02] transition-all">
                <div className="flex justify-between items-start mb-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 relative">
                            <Package size={18} className={order.status === 'Processing' ? 'text-blue-400 animate-pulse' : 'text-primary'} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-white text-base tracking-tight">Order #{order.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold font-mono">
                                {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {order.status !== 'Cancelled' && (
                            <button
                                onClick={handleTrackOrder}
                                className="px-2.5 py-1 rounded-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-primary/10"
                                title="Open Live Delivery Tracking Map"
                            >
                                <Navigation size={11} className="text-primary animate-pulse" />
                                Track
                            </button>
                        )}
                        <StatusBadge status={order.status} />
                    </div>
                </div>

                {/* Progress bar visual tracking line (only for non-cancelled orders) */}
                {order.status !== 'Cancelled' && (
                    <div className="mb-4 mt-2 px-1">
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                                progressIndex === 1 ? 'w-1/3 bg-blue-500' :
                                progressIndex === 2 ? 'w-2/3 bg-orange-500' :
                                progressIndex === 3 ? 'w-full bg-emerald-500' : 'w-0'
                            }`} />
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1.5 px-0.5">
                            <span className={progressIndex >= 1 ? 'text-blue-400' : ''}>Placed</span>
                            <span className={progressIndex >= 2 ? 'text-orange-400' : ''}>Shipped</span>
                            <span className={progressIndex >= 3 ? 'text-emerald-400' : ''}>Delivered</span>
                        </div>
                    </div>
                )}

                {/* Collapsed Items Preview list */}
                <div className="mt-4 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            {/* Larger Image Container with padding */}
                            <div className="w-14 h-14 rounded-xl border border-white/10 bg-[#1A1A22] overflow-hidden flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
                                <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-contain rounded-lg" />
                            </div>
                            
                            {/* Item Details */}
                            <div className="flex-grow min-w-0">
                                <h4 className="text-xs font-black text-white truncate tracking-tight">{item.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-wide">
                                    Quantity: <span className="text-white font-extrabold">{item.quantity}</span> × ₱{(item.salesPrice || item.price || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-3.5 mt-3.5 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider font-mono">
                        {order.items.reduce((acc, item) => acc + item.quantity, 0)} Total Item(s)
                    </span>

                    <div className="text-right flex items-center gap-3">
                        <div>
                            <p className="text-[9px] text-gray-500 font-bold text-right mb-0.5 uppercase tracking-wider">Total Amount</p>
                            <p className="text-base font-black text-primary leading-none">₱{order.total.toLocaleString()}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center transition-transform duration-300 border border-white/5 ${isExpanded ? 'rotate-180 text-primary' : 'text-gray-500'}`}>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-white/5 animate-slideDown bg-white/[0.01]">
                    <div className="p-5 space-y-5">
                        {/* Status history tracking */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <div className="bg-[#101015]/60 rounded-xl p-3 border border-white/5 space-y-3.5">
                                <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                    <Clock size={11} className="text-primary" /> Delivery Milestones
                                </h4>
                                <div className="relative pl-3.5 border-l border-white/5 space-y-4 my-1 ml-1">
                                    {order.statusHistory.slice().reverse().map((history, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className={`absolute -left-[19.5px] top-1 w-2 h-2 rounded-full border ${
                                                idx === 0 
                                                    ? 'bg-primary border-primary animate-pulse' 
                                                    : 'bg-[#15151A] border-gray-600'
                                            }`} />
                                            <p className={`text-xs font-black tracking-wide ${idx === 0 ? 'text-white' : 'text-gray-500'}`}>
                                                {history.status}
                                            </p>
                                            <p className="text-[9px] text-gray-600 font-bold font-mono mt-0.5">
                                                {new Date(history.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ordered items details layout */}
                        <div className="bg-[#101015]/60 rounded-xl p-3.5 border border-white/5 space-y-3">
                            <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                <ShoppingBag size={11} className="text-primary" /> Itemized Summary ({order.items.length})
                            </h4>
                            <div className="space-y-2">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 last:pb-0">
                                        <div className="w-11 h-11 bg-black/30 rounded-lg p-1 flex items-center justify-center border border-white/5">
                                            <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">Qty: {item.quantity} × ₱{(item.salesPrice || item.price).toLocaleString()}</p>
                                        </div>
                                        <p className="text-xs font-black text-white shrink-0">₱{((item.salesPrice || item.price) * item.quantity).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shipping details and transaction method */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#101015]/60 rounded-xl p-3 border border-white/5 flex items-start gap-2.5">
                                <CreditCard size={14} className="text-gray-500 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-0.5 font-mono">Payment</p>
                                    <p className="text-xs font-bold text-white truncate">{order.paymentMethod || 'Cash on Delivery'}</p>
                                </div>
                            </div>
                            <div className="bg-[#101015]/60 rounded-xl p-3 border border-white/5 flex items-start gap-2.5">
                                <MapPin size={14} className="text-gray-500 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-0.5 font-mono">Delivery</p>
                                    <p className="text-xs font-bold text-white truncate">Door-to-door Delivery</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions group container */}
                        <div className="flex gap-2 justify-end pt-1.5 border-t border-white/5">
                            <button
                                onClick={handleContactSupport}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black text-gray-300 transition-colors border border-white/10 uppercase tracking-wider"
                            >
                                <MessageCircle size={12} className="text-primary" /> Contact Support
                            </button>
                            <button
                                onClick={handleBuyAgain}
                                className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-orange-600 rounded-lg text-[10px] font-black text-white transition-all shadow-md shadow-primary/10 uppercase tracking-wider"
                            >
                                <Repeat size={12} /> Buy Again
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
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Delivered' | 'Cancelled'>('All');
    const [activeOrderForTracking, setActiveOrderForTracking] = useState<Order | null>(null);

    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const orderId = queryParams.get('id');
        if (orderId) {
            setExpandedOrderId(orderId);
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    const userOrders = useMemo(() => {
        if (!user || !db) return [];
        return db.orders
            .filter(order => order.customerId === user.id || order.customerName === user.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, db]);

    // Financial KPI analytics computed locally
    const statsSummary = useMemo(() => {
        const delivered = userOrders.filter(o => o.status === 'Delivered');
        const active = userOrders.filter(o => ['Processing', 'Shipped'].includes(o.status));
        const totalSpent = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
        return {
            deliveredCount: delivered.length,
            activeCount: active.length,
            totalSpent
        };
    }, [userOrders]);

    // Filtering and search queries logic
    const filteredOrders = useMemo(() => {
        return userOrders.filter(order => {
            // Status Tab Filtering
            const matchesTab = 
                activeTab === 'All' ? true :
                activeTab === 'Active' ? ['Processing', 'Shipped'].includes(order.status) :
                activeTab === 'Delivered' ? order.status === 'Delivered' :
                activeTab === 'Cancelled' ? order.status === 'Cancelled' : false;

            // Text Search Filtering
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query ? true :
                order.id.toLowerCase().includes(query) ||
                order.items.some(item => item.name.toLowerCase().includes(query));

            return matchesTab && matchesSearch;
        });
    }, [userOrders, activeTab, searchQuery]);

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
        <div className="flex flex-col min-h-screen bg-[#121212] select-none">
            <CustomerHeader title="Order History" showBackButton icon={<Package size={22} />} />
            
            <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-20">
                {userOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-5 px-6">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-inner animate-pulse">
                            <Package size={36} className="text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">No Orders Yet</h2>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Your purchase history will appear here once you place your first order.</p>
                        </div>
                        <button
                            onClick={() => navigate('/customer-portal/parts-store')}
                            className="bg-primary hover:bg-orange-600 text-white font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/25 active:scale-95"
                        >
                            Explore Parts Store
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Analytics summary rows */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="bg-[#15151A] border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Active</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-lg font-black text-blue-400">{statsSummary.activeCount}</span>
                                    <span className="text-[9px] text-gray-600 font-bold font-mono">orders</span>
                                </div>
                            </div>
                            <div className="bg-[#15151A] border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Completed</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-lg font-black text-emerald-400">{statsSummary.deliveredCount}</span>
                                    <span className="text-[9px] text-gray-600 font-bold font-mono">orders</span>
                                </div>
                            </div>
                            <div className="bg-[#15151A] border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Total Spent</span>
                                <div className="mt-1">
                                    <span className="text-sm font-black text-white">₱{statsSummary.totalSpent.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters Controls */}
                        <div className="space-y-3">
                            {/* Search Box */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search by Order ID or Part Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#15151A] border border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl pl-11 pr-4 py-3 text-xs text-white outline-none transition-all font-medium placeholder-gray-600"
                                />
                            </div>

                            {/* Filters tabs */}
                            <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
                                {(['All', 'Active', 'Delivered', 'Cancelled'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                            activeTab === tab 
                                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/10' 
                                                : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Orders List display */}
                        <div className="space-y-3.5 pt-1">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Results ({filteredOrders.length})</span>
                            </div>
                            
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        isExpanded={expandedOrderId === order.id}
                                        onToggle={() => handleToggle(order.id)}
                                        onTrack={(ord) => setActiveOrderForTracking(ord)}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                    <AlertCircle size={24} className="text-gray-600" />
                                    <p className="text-xs text-gray-500 font-bold">No orders match your filters or search query.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Realtime Delivery Live Map Modal */}
            {activeOrderForTracking && (() => {
                const { store, customer } = resolveOrderTrackingLocations(activeOrderForTracking, user, db?.settings);
                const orderRef = activeOrderForTracking.id ? `ORD-${activeOrderForTracking.id.slice(-6).toUpperCase()}` : 'ORDER';

                return (
                    <LiveRouteMapModal
                        isOpen={true}
                        onClose={() => setActiveOrderForTracking(null)}
                        trackingType="order"
                        customerLocation={{
                            lat: customer.lat,
                            lng: customer.lng,
                            address: customer.address
                        }}
                        mechanicLocation={{
                            lat: store.lat,
                            lng: store.lng,
                            address: store.address
                        }}
                        deliveryRider={{
                            name: 'Carlos Mendoza',
                            phone: '+63 917 555 8921',
                            vehicle: 'Honda Click 150i (Store Courier)',
                            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
                            plateNumber: 'RB-8821-EX'
                        }}
                        customerName={customer.name}
                        customerPhone={customer.phone || user?.phone || '+63 917 123 4567'}
                        customerAddress={customer.address}
                        destinationAddress={customer.address}
                        originAddress={store.address}
                        title={`Store Delivery Route — #${orderRef}`}
                        status={activeOrderForTracking.status || 'Processing'}
                        eta="18 mins"
                        etaNote="Dispatched from RidersBUD Parts & Tools Store Hub"
                        orderNumber={`#${orderRef}`}
                        onCallCustomer={() => {
                            if (customer.phone) window.open(`tel:${customer.phone}`);
                            else navigate('/customer-portal/support-chat');
                        }}
                        onChatCustomer={() => {
                            setActiveOrderForTracking(null);
                            navigate('/customer-portal/support-chat');
                        }}
                        appLogoUrl={db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/ridersbud_logo.png'}
                    />
                );
            })()}
        </div>
    );
};

export default OrderHistoryScreen;
