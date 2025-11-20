import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Order } from '../types';

const OrderConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { order } = (location.state as { order: Order }) || {};

    React.useEffect(() => {
        if (!order) {
            navigate('/');
        }
    }, [order, navigate]);

    if (!order) {
        return null;
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Order Confirmed" />
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-3xl font-bold text-white">Payment Successful!</h2>
                <p className="text-light-gray max-w-sm">
                    Thank you for your purchase. Your order #{order.id.toUpperCase().slice(-6)} has been placed and will be processed shortly.
                </p>

                <div className="w-full max-w-sm bg-dark-gray p-4 rounded-lg text-left space-y-2">
                    <div className="flex justify-between">
                        <span className="text-light-gray">Total Paid:</span>
                        <span className="font-bold text-primary">₱{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-light-gray">Payment Method:</span>
                        <span className="font-medium text-white">{order.paymentMethod}</span>
                    </div>
                </div>

                <button 
                    onClick={() => navigate('/')} 
                    className="w-full max-w-sm bg-primary text-white font-bold py-3 mt-4 rounded-lg hover:bg-orange-600 transition"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default OrderConfirmationScreen;