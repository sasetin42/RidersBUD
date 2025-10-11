
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';

const PaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { total } = (location.state as { total: number }) || { total: 0 };
    const { cartItems, clearCart } = useCart();
    const { addOrder } = useDatabase();
    const { user } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        // Redirect if there's nothing to pay for, but not while processing is happening
        if (total <= 0 && !isProcessing) {
            navigate('/cart');
        }
    }, [total, isProcessing, navigate]);

    const formatCardNumber = (value: string) => {
        return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    };

    const formatExpiryDate = (value: string) => {
        return value.replace(/\//g, '').replace(/(\d{2})(\d{1,2})/, '$1/$2').trim();
    };

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;

        if (name === 'number') {
            if (value.length > 19) return;
            value = formatCardNumber(value.replace(/[^\d]/g, ''));
        }
        if (name === 'expiry') {
            if (value.length > 5) return;
            value = formatExpiryDate(value.replace(/[^\d]/g, ''));
        }
        if (name === 'cvc') {
            if (value.length > 4) return;
            value = value.replace(/[^\d]/g, '');
        }

        setCardDetails(prev => ({ ...prev, [name]: value }));
        setCardErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateCard = () => {
        const errors: { [key: string]: string } = {};
        if (cardDetails.number.replace(/\s/g, '').length !== 16) {
            errors.number = 'Card number must be 16 digits.';
        }
        const [month, year] = cardDetails.expiry.split('/');
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry) || !month || !year) {
            errors.expiry = 'Invalid format. Use MM/YY.';
        } else {
            const currentYear = new Date().getFullYear() % 100;
            const currentMonth = new Date().getMonth() + 1;
            if (Number(year) < currentYear || (Number(year) === currentYear && Number(month) < currentMonth)) {
                errors.expiry = 'Card has expired.';
            }
        }
        if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
            errors.cvc = 'CVC must be 3-4 digits.';
        }
        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProcessPayment = async () => {
        if (!user) {
            setError("User not found. Please log in again.");
            return;
        }
        if (!selectedMethod) {
            setError("Please select a payment method.");
            return;
        }
        if (selectedMethod === 'Credit Card' && !validateCard()) {
            return;
        }

        setIsProcessing(true);
        setError('');

        // Simulate payment processing
        setTimeout(async () => {
            try {
                const newOrder = await addOrder(user.name, cartItems, total, selectedMethod);
                if (newOrder) {
                    clearCart();
                    navigate('/order-confirmation', { state: { order: newOrder }, replace: true });
                } else {
                    throw new Error("Order creation failed in the database.");
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try another payment method or contact support.");
                 setIsProcessing(false);
            }
        }, 2000);
    };
    
    const paymentOptions = [
        { name: 'Credit Card', icon: '💳' },
        { name: 'GCash', icon: '🇬' },
        { name: 'Paymaya', icon: '🇵' },
        { name: 'Cash on Delivery', icon: '💵' },
    ];

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Checkout" showBackButton />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Order Summary */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-white mb-2">Order Summary</h3>
                    <div className="space-y-2">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="text-light-gray">{item.name} <span className="text-white">x {item.quantity}</span></span>
                                <span className="text-white">₱{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                <div>
                    <h3 className="font-semibold text-lg text-white mb-3">Payment Method</h3>
                    <div className="space-y-3">
                        {paymentOptions.map(option => (
                            <button
                                key={option.name}
                                onClick={() => setSelectedMethod(option.name)}
                                className={`w-full flex items-center p-4 bg-dark-gray rounded-lg transition-all duration-200 border-2 ${selectedMethod === option.name ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                            >
                                <span className="text-2xl mr-4">{option.icon}</span>
                                <span className="font-semibold text-white">{option.name}</span>
                                <div className={`w-5 h-5 rounded-full border-2 ml-auto flex-shrink-0 ${selectedMethod === option.name ? 'border-primary bg-primary' : 'border-light-gray'}`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Credit Card Form */}
                {selectedMethod === 'Credit Card' && (
                    <div className="bg-dark-gray p-4 rounded-lg space-y-3 animate-fadeIn">
                        <h4 className="font-semibold text-white">Enter Card Details</h4>
                        <div className="relative">
                            <input type="text" name="number" placeholder="Card Number" value={cardDetails.number} onChange={handleCardChange} className={`w-full pl-10 pr-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.number ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-light-gray">💳</span>
                             {cardErrors.number && <p className="text-red-400 text-xs mt-1">{cardErrors.number}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input type="text" name="expiry" placeholder="MM/YY" value={cardDetails.expiry} onChange={handleCardChange} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.expiry ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                                {cardErrors.expiry && <p className="text-red-400 text-xs mt-1">{cardErrors.expiry}</p>}
                            </div>
                            <div>
                                <input type="text" name="cvc" placeholder="CVC" value={cardDetails.cvc} onChange={handleCardChange} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.cvc ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                                {cardErrors.cvc && <p className="text-red-400 text-xs mt-1">{cardErrors.cvc}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray space-y-3">
                 {error && (
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400 text-xs text-center animate-fadeIn">
                        <p className="font-semibold">Payment Failed:</p>
                        <p>{error}</p>
                    </div>
                )}
                <div className="flex justify-between items-center text-lg">
                    <span className="text-light-gray">Total:</span>
                    <span className="font-bold text-2xl text-primary">₱{total.toFixed(2)}</span>
                </div>
                <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing || !selectedMethod}
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50"
                >
                    {isProcessing ? <Spinner size="sm" /> : `Pay Now`}
                </button>
            </div>
        </div>
    );
};

export default PaymentScreen;
