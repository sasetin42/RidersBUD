import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Order } from '../types';

const OrderCard: React.FC<{ order: Order; isExpanded: boolean; onToggle: () => void; }> = ({ order, isExpanded, onToggle }) => {
    return (
        <div className="bg-dark-gray rounded-lg overflow-hidden">
            <div onClick={onToggle} className="p-4 cursor-pointer flex justify-between items-center">
                <div>
                    <p className="font-bold text-white">Order #{order.id.toUpperCase().slice(-6)}</p>
                    <p className="text-sm text-light-gray">
                        {new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-primary">₱{order.total.toFixed(2)}</p>
                    <div className="flex items-center gap-2 text-sm text-light-gray">
                        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="bg-field p-4 border-t border-secondary space-y-3">
                    <h4 className="font-semibold text-white">Items:</h4>
                    {order.items.map(item => (
                        <div key={item.id} className="flex items-center">
                            <img src={item.imageUrls[0]} alt={item.name} className="w-12 h-12 rounded-md object-cover mr-3" />
                            <div className="flex-grow">
                                <p className="text-sm font-medium text-white">{item.name}</p>
                                <p className="text-xs text-light-gray">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-white">₱{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    ))}
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
             <div className="flex flex-col h-full bg-secondary">
                <Header title="Order History" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Order History" showBackButton />
            <main className="flex-grow overflow-y-auto p-4">
                {userOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-xl font-semibold mb-2">No Orders Yet</p>
                        <p>Your past purchases from the Parts Store will appear here.</p>
                    </div>
                ) : (
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
                )}
            </main>
        </div>
    );
};

export default OrderHistoryScreen;