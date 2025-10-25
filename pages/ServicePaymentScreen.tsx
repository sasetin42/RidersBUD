import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Booking } from '../types';

const ServicePaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { booking } = (location.state as { booking: Booking }) || {};
    const { markBookingAsPaid } = useDatabase();
    const { user } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!booking && !isProcessing) {
            navigate('/booking-history');
        }
    }, [booking, isProcessing, navigate]);

    if (!booking) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

    const total = booking.service.price;

    const formatCardNumber = (value: string) => value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    const formatExpiryDate = (value: string) => value.replace(/\//g, '').replace(/(\d{2})(\d{1,2})/, '$1/$2').trim();

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'number' && value.length > 19) return;
        if (name === 'expiry' && value.length > 5) return;
        if (name === 'cvc' && value.length > 4) return;
        
        if (name === 'number') value = formatCardNumber(value.replace(/[^\d]/g, ''));
        if (name === 'expiry') value = formatExpiryDate(value.replace(/[^\d]/g, ''));
        if (name === 'cvc') value = value.replace(/[^\d]/g, '');

        setCardDetails(prev => ({ ...prev, [name]: value }));
        setCardErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateCard = () => {
        const errors: { [key: string]: string } = {};
        if (cardDetails.number.replace(/\s/g, '').length !== 16) errors.number = 'Card number must be 16 digits.';
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
        if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) errors.cvc = 'CVC must be 3-4 digits.';
        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProcessPayment = async () => {
        if (!user) { setError("User not found. Please log in again."); return; }
        if (!selectedMethod) { setError("Please select a payment method."); return; }
        if (selectedMethod === 'Credit Card' && !validateCard()) return;

        setIsProcessing(true);
        setError('');

        setTimeout(async () => {
            try {
                await markBookingAsPaid(booking.id);
                const updatedBooking = { ...booking, isPaid: true };
                navigate('/service-payment-confirmation', { state: { booking: updatedBooking }, replace: true });
            } catch (err) {
                 setError(err instanceof Error ? err.message : "An unexpected error occurred.");
                 setIsProcessing(false);
            }
        }, 2000);
    };
    
    const paymentOptions = [{ name: 'Credit Card', icon: '💳' }, { name: 'GCash', icon: '🇬' }, { name: 'Paymaya', icon: '🇵' }];

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Pay for Service" showBackButton />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Service Summary */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-white mb-2">Service Summary</h3>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-light-gray">{booking.service.name} for {booking.vehicle.make} {booking.vehicle.model}</span>
                        <span className="text-white font-semibold">₱{booking.service.price.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div>
                    <h3 className="font-semibold text-lg text-white mb-3">Payment Method</h3>
                    <div className="space-y-3">
                        {paymentOptions.map(option => (
                            <button key={option.name} onClick={() => setSelectedMethod(option.name)} className={`w-full flex items-center p-4 bg-dark-gray rounded-lg transition-all duration-200 border-2 ${selectedMethod === option.name ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
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
                        <input type="text" name="number" placeholder="Card Number" value={cardDetails.number} onChange={handleCardChange} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.number ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                        {cardErrors.number && <p className="text-red-400 text-xs mt-1">{cardErrors.number}</p>}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input type="text" name="expiry" placeholder="MM/YY" value={cardDetails.expiry} onChange={handleCardChange} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.expiry ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                                {cardErrors.expiry && <p className="text-red-400 text-xs mt-1">{cardErrors.expiry}</p>}
                            </div>
                            <div>
                                <input type="text" name="cvc" placeholder="CVC" value={cardDetails.cvc} onChange={handleCardChange} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${cardErrors.cvc ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                                {cardErrors.cvc && <p className="text-red-400 text-xs mt-1">{cardErrors.cvc}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray space-y-3">
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <div className="flex justify-between items-center text-lg">
                    <span className="text-light-gray">Total:</span>
                    <span className="font-bold text-2xl text-primary">₱{total.toFixed(2)}</span>
                </div>
                <button onClick={handleProcessPayment} disabled={isProcessing || !selectedMethod} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50">
                    {isProcessing ? <Spinner size="sm" /> : `Pay ₱${total.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
};

export default ServicePaymentScreen;
