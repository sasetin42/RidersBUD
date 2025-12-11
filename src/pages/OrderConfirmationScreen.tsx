import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Order } from '../types';
import { CheckCircle, Package, Download, ChevronRight, Home, MapPin, Calendar, CreditCard } from 'lucide-react';

const OrderConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { order } = (location.state as { order: Order }) || {};

    useEffect(() => {
        if (!order) {
            navigate('/');
        }
    }, [order, navigate]);

    if (!order) {
        return null;
    }

    // Mock Delivery Date (3 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    return (
        <div className="flex flex-col min-h-screen bg-secondary text-white font-sans selection:bg-orange-500/30">
            <Header title="Order Confirmed" transparent showBackButton />

            <div className="flex-grow p-5 space-y-6 pt-24 pb-32 animate-fadeIn">

                {/* Success Animation & Header */}
                <div className="text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
                        <CheckCircle className="w-24 h-24 text-green-500 relative z-10 animate-scaleUp" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Order Placed!</h1>
                        <p className="text-gray-400 text-sm mt-2">
                            Thank you for your purchase. Your order <span className="text-primary font-mono">#{order.id.toUpperCase().slice(-6)}</span> has been received.
                        </p>
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="glass-button p-3 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group">
                        <Package className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-gray-300">Track Order</span>
                    </button>
                    <button className="glass-button p-3 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group">
                        <Download className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-gray-300">Invoice</span>
                    </button>
                </div>

                {/* Order Details Card */}
                <div className="glass-panel p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Order Summary</h3>
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                            Payment Successful
                        </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        {order.items.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex gap-4">
                                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                                    <img
                                        src={item.imageUrls?.[0] || 'https://via.placeholder.com/150'}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                                    <p className="text-xs text-gray-400 mt-1">{item.brand}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                        <span className="text-sm font-bold text-primary">₱{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="border-t border-white/5 pt-4 space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Payment Method</span>
                            <span className="text-white flex items-center gap-1"><CreditCard size={12} /> {order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Estimated Delivery</span>
                            <span className="text-white flex items-center gap-1"><Calendar size={12} /> {deliveryDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/5 mt-2">
                            <span>Grand Total</span>
                            <span className="text-primary">₱{order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Shipping Info (Static/Mock for now) */}
                <div className="glass-panel p-4 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-white/5 text-primary mt-1">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Shipping to</h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            {/* This would ideally come from the order object if address was saved */}
                            123 Rider's St, Barangay San Antonio, Pasig City, Metro Manila
                        </p>
                    </div>
                </div>

                {/* Back Home Button */}
                <button
                    onClick={() => navigate('/home')}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                    <Home size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </button>

            </div>
        </div>
    );
};

export default OrderConfirmationScreen;