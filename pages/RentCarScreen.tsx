import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { RentalCar } from '../types';
import { useAuth } from '../context/AuthContext';

const RentalBookingModal: React.FC<{
    car: RentalCar;
    onClose: () => void;
    onConfirm: (bookingDetails: { startDate: string; endDate: string; totalPrice: number }) => Promise<void>;
}> = ({ car, onClose, onConfirm }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { duration, totalPrice } = useMemo(() => {
        if (!startDate || !endDate) return { duration: 0, totalPrice: 0 };
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) return { duration: 0, totalPrice: 0 };
        const timeDiff = end.getTime() - start.getTime();
        const duration = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        return { duration, totalPrice: duration * car.pricePerDay };
    }, [startDate, endDate, car.pricePerDay]);

    const handleConfirm = async () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Please select both a start and end date.');
            return;
        }
        if (duration <= 0) {
            setError('End date must be on or after the start date.');
            return;
        }

        setIsConfirming(true);
        try {
            await onConfirm({ startDate, endDate, totalPrice });
            setIsSuccess(true);
        } catch (e) {
            setError('Failed to create booking. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm text-center animate-scaleUp">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-xl font-bold text-white">Booking Confirmed!</h2>
                    <p className="text-light-gray mt-2 mb-4">You have successfully rented the {car.make} {car.model}.</p>
                    <div className="bg-field p-3 rounded-lg text-left text-sm space-y-1">
                        <p><span className="text-light-gray">Dates:</span> {new Date(startDate.replace(/-/g, '/')).toLocaleDateString()} to {new Date(endDate.replace(/-/g, '/')).toLocaleDateString()}</p>
                        <p><span className="text-light-gray">Total Price:</span> <span className="font-semibold text-primary">₱{totalPrice.toLocaleString()}</span></p>
                    </div>
                    <button onClick={onClose} className="mt-6 w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600">Done</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold mb-4">Rent: {car.make} {car.model}</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-2 bg-field border border-secondary rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} className="w-full p-2 bg-field border border-secondary rounded-md" />
                        </div>
                    </div>
                    {duration > 0 && (
                        <div className="bg-field p-3 rounded-lg text-center">
                            <p className="text-light-gray">{duration} Day{duration > 1 ? 's' : ''} x ₱{car.pricePerDay.toLocaleString()}</p>
                            <p className="text-xl font-bold text-primary">Total: ₱{totalPrice.toLocaleString()}</p>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                </div>
                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700">Cancel</button>
                    <button onClick={handleConfirm} disabled={isConfirming} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center">
                        {isConfirming ? <Spinner size="sm" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RentalCarCard: React.FC<{ car: RentalCar; onRent: (car: RentalCar) => void }> = ({ car, onRent }) => {
    return (
        <div className="bg-dark-gray rounded-lg overflow-hidden shadow-lg border border-transparent hover:border-primary/50 transition-all duration-300">
            <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="w-full h-40 object-cover" />
            <div className="p-4">
                <h3 className="text-lg font-bold text-white">{car.year} {car.make} {car.model}</h3>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-light-gray">{car.type}</p>
                    {car.isAvailable ? 
                        <span className="text-xs font-semibold bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Available</span> :
                        <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-2 py-1 rounded-full">Unavailable</span>
                    }
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-field">
                    <p className="text-xl font-bold text-primary">₱{car.pricePerDay.toLocaleString()}<span className="text-sm font-normal text-light-gray">/day</span></p>
                    <div className="flex items-center text-sm text-light-gray">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        {car.seats} Seats
                    </div>
                </div>
                <button 
                    onClick={() => onRent(car)}
                    disabled={!car.isAvailable}
                    className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition mt-4 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Rent Now
                </button>
            </div>
        </div>
    );
};

const RentCarScreen: React.FC = () => {
    const { db, addRentalBooking, loading } = useDatabase();
    const { user } = useAuth();
    const [selectedCar, setSelectedCar] = useState<RentalCar | null>(null);

    const handleConfirmBooking = async (bookingDetails: { startDate: string; endDate: string; totalPrice: number }) => {
        if (!user || !selectedCar) return;
        await addRentalBooking({
            carId: selectedCar.id,
            customerName: user.name,
            startDate: bookingDetails.startDate,
            endDate: bookingDetails.endDate,
            totalPrice: bookingDetails.totalPrice,
        });
    };

    if (loading || !db) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Rent a Car" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Rent a Car" showBackButton />
            <main className="flex-grow overflow-y-auto p-4 space-y-4">
                {db.rentalCars.map(car => (
                    <RentalCarCard key={car.id} car={car} onRent={setSelectedCar} />
                ))}
            </main>
            {selectedCar && (
                <RentalBookingModal 
                    car={selectedCar}
                    onClose={() => setSelectedCar(null)}
                    onConfirm={handleConfirmBooking}
                />
            )}
        </div>
    );
};

export default RentCarScreen;