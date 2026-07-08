import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { Car, Users, Fuel, Settings, Briefcase, Calendar, UserCheck, ShieldCheck, Receipt, CheckCircle } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import FilterSelect from '../components/FilterSelect';
import { RentalCar } from '../types';
import { useAuth } from '../context/AuthContext';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { doc, collection } from 'firebase/firestore';
import { db as firestore } from '../firebase';

const RentalBookingModal: React.FC<{
    car: RentalCar;
    onClose: () => void;
    onConfirm: (bookingDetails: { startDate: string; endDate: string; totalPrice: number; includeDriver: boolean; newId: string }) => Promise<any> | void;
    accentColor: string;
}> = ({ car, onClose, onConfirm, accentColor }) => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeDriver, setIncludeDriver] = useState(false);
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const carImgUrl = useMemo(() => {
        let url = car.imageUrl;
        if (!url || url.includes('placehold.co') || url.includes('picsum.photos') || url.includes('/placeholder.svg')) {
            const modelLower = car.model.toLowerCase();
            if (modelLower.includes('montero')) return '/images/cars/montero.jpg';
            if (modelLower.includes('vios')) return '/images/cars/vios.jpg';
            if (modelLower.includes('mustang')) return '/images/cars/mustang.jpg';
            if (modelLower.includes('hiace')) return '/images/cars/hiace.jpg';
        }
        if (url && url.endsWith('.png')) {
            return url.replace(/\.png$/, '.jpg');
        }
        return url;
    }, [car.imageUrl, car.model]);

    const specs = useMemo(() => {
        const modelLower = car.model.toLowerCase();
        
        let seats = car.seats || 5;
        let fuelType = 'Gasoline';
        let transmission = car.transmission || 'Automatic';
        let baggage = 2;
        
        if (modelLower.includes('montero') || modelLower.includes('fortuner')) {
            seats = 7;
            fuelType = 'Diesel';
            transmission = 'Automatic';
            baggage = 3;
        } else if (modelLower.includes('mustang') || modelLower.includes('challenger') || modelLower.includes('camaro')) {
            seats = 4;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('hiace') || modelLower.includes('urvan') || modelLower.includes('starex')) {
            seats = 12;
            fuelType = 'Diesel';
            transmission = 'Manual';
            baggage = 4;
        } else if (modelLower.includes('vios') || modelLower.includes('civic') || modelLower.includes('altis') || modelLower.includes('accent') || modelLower.includes('city') || modelLower.includes('sedan')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('mirage') || modelLower.includes('wigo') || modelLower.includes('brio') || modelLower.includes('hatchback')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 1;
        }
        
        if (car.seats) seats = car.seats;
        if (car.transmission) transmission = car.transmission;
        if (car.fuelPolicy) {
            if (car.fuelPolicy.toLowerCase().includes('diesel')) {
                fuelType = 'Diesel';
            } else if (car.fuelPolicy.toLowerCase().includes('gas')) {
                fuelType = 'Gas';
            }
        }
        
        return { seats, fuelType, transmission, baggage };
    }, [car]);

    const validationError = useMemo(() => {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date format.';
        if (end < start) {
            return 'End date cannot be before start date.';
        }
        return '';
    }, [startDate, endDate]);

    const { duration, basePrice, driverFee, securityDeposit, totalPrice } = useMemo(() => {
        if (!startDate || !endDate || validationError) {
            return { duration: 0, basePrice: 0, driverFee: 0, securityDeposit: 3000, totalPrice: 3000 };
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const duration = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const basePrice = duration * car.pricePerDay;
        const driverFee = includeDriver ? (duration * 1500) : 0;
        const securityDeposit = 3000;
        const totalPrice = basePrice + driverFee + securityDeposit;
        return { duration, basePrice, driverFee, securityDeposit, totalPrice };
    }, [startDate, endDate, car.pricePerDay, includeDriver, validationError]);

    const handleConfirm = async () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Please select both a start and end date.');
            return;
        }
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsConfirming(true);
        try {
            const newId = doc(collection(firestore, 'rentalBookings')).id;
            await onConfirm({ startDate, endDate, totalPrice, includeDriver, newId });
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create booking. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };
    
    const isFormInvalid = !startDate || !endDate || !!validationError;
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="bg-dark-gray border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-scaleUp max-h-[90vh] overflow-y-auto cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-white mb-2">Rent: {car.make} {car.model}</h2>
                    
                    {/* Selected Car Image with predefined layout constraints to prevent CLS */}
                    <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-white/10 bg-field relative aspect-[16/9] shrink-0">
                        <img 
                            src={carImgUrl} 
                            alt={`${car.make} ${car.model}`} 
                            className="w-full h-full object-cover" 
                            width={320}
                            height={180}
                        />
                    </div>

                    <p className="text-sm font-semibold mb-2" style={{ color: accentColor }}>
                        ₱{car.pricePerDay.toLocaleString()}<span className="text-xs text-light-gray font-normal">/day (Base Price)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray px-2 py-0.5 rounded-md font-semibold">
                            <Users size={10} className="text-light-gray/70" />
                            {specs.seats} Seats
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray px-2 py-0.5 rounded-md font-semibold">
                            <Fuel size={10} className="text-light-gray/70" />
                            {specs.fuelType}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray px-2 py-0.5 rounded-md font-semibold">
                            <Settings size={10} className="text-light-gray/70" />
                            {specs.transmission}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="rent-start-date" className="text-xs text-light-gray mb-1 block">Start Date</label>
                            <div className="relative flex items-center">
                                <Calendar size={14} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: startDate ? accentColor : undefined }} />
                                <input 
                                    id="rent-start-date" 
                                    name="rent-start-date" 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => {
                                        const newStart = e.target.value;
                                        setStartDate(newStart);
                                        setError('');
                                        if (endDate && endDate < newStart) {
                                            setEndDate(newStart);
                                        }
                                    }} 
                                    min={new Date().toISOString().split('T')[0]} 
                                    className={`w-full p-2.5 pl-9 bg-field border rounded-xl outline-none transition-all text-white text-xs ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/20'
                                    }`} 
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="rent-end-date" className="text-xs text-light-gray mb-1 block">End Date</label>
                            <div className="relative flex items-center">
                                <Calendar size={14} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: endDate ? accentColor : undefined }} />
                                <input 
                                    id="rent-end-date" 
                                    name="rent-end-date" 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        setError('');
                                    }} 
                                    min={startDate || new Date().toISOString().split('T')[0]} 
                                    className={`w-full p-2.5 pl-9 bg-field border rounded-xl outline-none transition-all text-white text-xs ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/20'
                                    }`} 
                                />
                            </div>
                        </div>
                    </div>

                    {validationError && (
                        <p className="text-red-400 text-xs font-semibold animate-fadeIn mt-1 pl-1">
                            {validationError}
                        </p>
                    )}

                    {/* Redesigned Include Driver Selection Cards */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-bold text-light-gray/90 block">Driver Option</span>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIncludeDriver(false)}
                                className={`p-2.5 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                                    !includeDriver 
                                        ? 'text-white border-primary' 
                                        : 'border-white/5 bg-field text-light-gray/50 hover:border-white/10'
                                }`}
                                style={!includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : {}}
                            >
                                <span className="text-xs font-bold">Self Drive</span>
                                <span className="text-[9px] font-semibold opacity-80">No extra fee</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIncludeDriver(true)}
                                className={`p-2.5 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                                    includeDriver 
                                        ? 'text-white border-primary' 
                                        : 'border-white/5 bg-field text-light-gray/50 hover:border-white/10'
                                }`}
                                style={includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : {}}
                            >
                                <span className="text-xs font-bold">With Driver</span>
                                <span className="text-[9px] font-semibold opacity-80">+₱1,500 / day</span>
                            </button>
                        </div>
                    </div>

                    {/* Segmented Receipt Breakdown Card - Smooth CSS height & opacity transition with GPU layout hints */}
                    <div 
                        className={`overflow-hidden transition-all duration-300 ease-out bg-[#121212] rounded-xl will-change-[max-height,opacity] ${
                            duration > 0 && !validationError 
                                ? 'max-h-[350px] opacity-100 border border-white/10 p-3.5 mt-4' 
                                : 'max-h-0 opacity-0 border-transparent p-0 m-0'
                        }`}
                    >
                        <div className="space-y-3 divide-y divide-white/5">
                            <div className="pb-3">
                                <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-light-gray/50 mb-2">Booking Receipt</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-light-gray">
                                        <span className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-blue-500/10 text-blue-400">
                                                <Car size={11} />
                                            </span>
                                            Base Rent ({duration} {duration > 1 ? 'days' : 'day'})
                                        </span>
                                        <span className="font-semibold text-white">₱{basePrice.toLocaleString()}</span>
                                    </div>
                                    <div className={`flex justify-between items-center text-light-gray transition-all duration-200 overflow-hidden ${includeDriver ? 'opacity-100 h-5 mt-2' : 'opacity-0 h-0 mt-0'}`}>
                                        <span className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-teal-500/10 text-teal-400">
                                                <UserCheck size={11} />
                                            </span>
                                            Professional Driver Fee
                                        </span>
                                        <span className="font-semibold text-white">₱{driverFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-light-gray mt-2">
                                        <span className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
                                                <ShieldCheck size={11} />
                                            </span>
                                            Security Deposit <span className="text-[9px] text-light-gray/40 font-normal">(Refundable)</span>
                                        </span>
                                        <span className="font-semibold text-white">₱{securityDeposit.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-3 flex justify-between items-end">
                                <span className="flex items-center gap-2 text-xs font-bold text-white">
                                    <span className="p-1 rounded bg-white/10 text-white" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                        <Receipt size={11} />
                                    </span>
                                    Total Amount
                                </span>
                                <span className="text-lg font-black" style={{ color: accentColor }}>
                                    ₱{totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-xs text-center font-semibold">{error}</p>}
                </div>

                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isConfirming || isFormInvalid} 
                        style={{ backgroundColor: isFormInvalid ? 'rgba(255,255,255,0.05)' : accentColor }}
                        className="w-1/2 text-white font-bold py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isConfirming ? <Spinner size="sm" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RentalCarCard: React.FC<{ 
    car: RentalCar; 
    onRent: (car: RentalCar) => void;
    accentColor: string;
}> = ({ car, onRent, accentColor }) => {
    const carImgUrl = useMemo(() => {
        let url = car.imageUrl;
        if (!url || url.includes('placehold.co') || url.includes('picsum.photos') || url.includes('/placeholder.svg')) {
            const modelLower = car.model.toLowerCase();
            if (modelLower.includes('montero')) return '/images/cars/montero.jpg';
            if (modelLower.includes('vios')) return '/images/cars/vios.jpg';
            if (modelLower.includes('mustang')) return '/images/cars/mustang.jpg';
            if (modelLower.includes('hiace')) return '/images/cars/hiace.jpg';
        }
        if (url && url.endsWith('.png')) {
            return url.replace(/\.png$/, '.jpg');
        }
        return url;
    }, [car.imageUrl, car.model]);

    const specs = useMemo(() => {
        const modelLower = car.model.toLowerCase();
        
        let seats = car.seats || 5;
        let fuelType = 'Gasoline';
        let transmission = car.transmission || 'Automatic';
        let baggage = 2;
        
        if (modelLower.includes('montero') || modelLower.includes('fortuner')) {
            seats = 7;
            fuelType = 'Diesel';
            transmission = 'Automatic';
            baggage = 3;
        } else if (modelLower.includes('mustang') || modelLower.includes('challenger') || modelLower.includes('camaro')) {
            seats = 4;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('hiace') || modelLower.includes('urvan') || modelLower.includes('starex')) {
            seats = 12;
            fuelType = 'Diesel';
            transmission = 'Manual';
            baggage = 4;
        } else if (modelLower.includes('vios') || modelLower.includes('civic') || modelLower.includes('altis') || modelLower.includes('accent') || modelLower.includes('city') || modelLower.includes('sedan')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('mirage') || modelLower.includes('wigo') || modelLower.includes('brio') || modelLower.includes('hatchback')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 1;
        }
        
        if (car.seats) seats = car.seats;
        if (car.transmission) transmission = car.transmission;
        if (car.fuelPolicy) {
            if (car.fuelPolicy.toLowerCase().includes('diesel')) {
                fuelType = 'Diesel';
            } else if (car.fuelPolicy.toLowerCase().includes('gas')) {
                fuelType = 'Gas';
            }
        }
        
        return { seats, fuelType, transmission, baggage };
    }, [car]);

    return (
        <div className="bg-dark-gray rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-white/10 transition-all duration-300 flex p-3 gap-3 animate-fadeIn">
            {/* Left side: Vehicle Image */}
            <div className="w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden shrink-0 bg-field relative aspect-[7/5] sm:aspect-[4/3]">
                <img 
                    src={carImgUrl} 
                    alt={`${car.make} ${car.model}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                />
            </div>
            
            {/* Right side: Details */}
            <div className="flex-grow flex flex-col justify-between min-w-0">
                <div>
                    {/* Header: Name & Badges */}
                    <div className="flex flex-wrap items-start justify-between gap-1.5 mb-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate mr-2">
                            {car.year} {car.make} {car.model}
                        </h3>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold bg-white/10 text-light-gray px-1.5 py-0.5 rounded-md">
                                {car.type}
                            </span>
                            {car.isAvailable ? (
                                <span className="text-[10px] font-bold bg-[#FACC15]/10 border border-[#FACC15]/20 text-[#FACC15] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
                                    Available
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-500 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Unavailable
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Specs Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 text-light-gray px-1.5 py-0.5 rounded">
                            <Users size={10} className="text-light-gray/70" />
                            {specs.seats} Seats
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 text-light-gray px-1.5 py-0.5 rounded">
                            <Fuel size={10} className="text-light-gray/70" />
                            {specs.fuelType}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 text-light-gray px-1.5 py-0.5 rounded">
                            <Settings size={10} className="text-light-gray/70" />
                            {specs.transmission}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 text-light-gray px-1.5 py-0.5 rounded">
                            <Briefcase size={10} className="text-light-gray/70" />
                            {specs.baggage} Bags
                        </span>
                    </div>
                </div>
                
                {/* Footer: Price & Rent Button */}
                <div className="flex items-center justify-between gap-2 mt-auto">
                    <p className="text-base sm:text-lg font-black" style={{ color: accentColor }}>
                        ₱{car.pricePerDay.toLocaleString()}
                        <span className="text-[10px] sm:text-xs font-normal text-light-gray">/day</span>
                    </p>
                    <button 
                        onClick={() => onRent(car)}
                        disabled={!car.isAvailable}
                        style={car.isAvailable ? { backgroundColor: accentColor } : undefined}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 active:scale-95 transition disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        Rent Now
                    </button>
                </div>
            </div>
        </div>
    );
};

const RentCarScreen: React.FC = () => {
    const { db, addRentalBooking, loading } = useDatabase();
    const { user } = useAuth();
    const [selectedCar, setSelectedCar] = useState<RentalCar | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [sortBy, setSortBy] = useState<string>('Featured');

    // GCash payment modal states
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [gcashBookingData, setGcashBookingData] = useState<any>(null);
    const [bookingId, setBookingId] = useState<string>('');
    const [totalPriceState, setTotalPriceState] = useState<number>(0);
    const [showSuccessView, setShowSuccessView] = useState(false);

    const navigate = useNavigate();
    const accentColor = db?.settings?.accentColor || '#FE7803';

    const handleConfirmBooking = async (bookingDetails: { startDate: string; endDate: string; totalPrice: number; includeDriver: boolean; newId: string }) => {
        if (!user) {
            throw new Error('User session not found. Please log in.');
        }
        if (!selectedCar) {
            throw new Error('No car selected.');
        }

        const pendingBookingData = {
            carId: selectedCar.id,
            customerId: user.id,
            customerName: user.name,
            startDate: bookingDetails.startDate,
            endDate: bookingDetails.endDate,
            totalPrice: bookingDetails.totalPrice,
            includeDriver: bookingDetails.includeDriver,
            status: 'Pending',
            paymentStatus: 'partial',
            isPaid: false,
        };

        setGcashBookingData(pendingBookingData);
        setBookingId(bookingDetails.newId);
        setTotalPriceState(bookingDetails.totalPrice);
        setShowGCashModal(true);
    };

    const filteredCars = useMemo(() => {
        if (!db?.rentalCars) return [];
        let result = [...db.rentalCars];
        
        // Category Filter
        if (activeCategory !== 'All') {
            const catLower = activeCategory.toLowerCase();
            result = result.filter(car => {
                const typeLower = car.type.toLowerCase();
                if (catLower === 'sports/luxury') {
                    return typeLower.includes('sports') || typeLower.includes('luxury');
                }
                return typeLower.includes(catLower);
            });
        }
        
        // Sort Filter
        if (sortBy === 'Price: Low to High') {
            result.sort((a, b) => a.pricePerDay - b.pricePerDay);
        } else if (sortBy === 'Price: High to Low') {
            result.sort((a, b) => b.pricePerDay - a.pricePerDay);
        } else if (sortBy === 'Seats: Most to Least') {
            result.sort((a, b) => b.seats - a.seats);
        }
        
        return result;
    }, [db, activeCategory, sortBy]);

    if (loading || !db) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <CustomerHeader title="Rent a Car" showBackButton icon={<Car size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <CustomerHeader title="Rent a Car" showBackButton icon={<Car size={22} />} />
            
            {/* Filter and Sorting Bar */}
            <div className="bg-[#0F172A] px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <FilterSelect
                        label="Category"
                        options={[
                            { value: 'All', label: 'All' },
                            { value: 'SUV', label: 'SUV' },
                            { value: 'Sedan', label: 'Sedan' },
                            { value: 'Van', label: 'Van' },
                            { value: 'Hatchback', label: 'Hatchback' },
                            { value: 'Sports/Luxury', label: 'Sports/Luxury' },
                        ]}
                        value={activeCategory}
                        onChange={setActiveCategory}
                        accentColor={accentColor}
                    />
                    <FilterSelect
                        label="Sort By"
                        options={[
                            { value: 'Featured', label: 'Featured' },
                            { value: 'Price: Low to High', label: 'Price: Low to High' },
                            { value: 'Price: High to Low', label: 'Price: High to Low' },
                            { value: 'Seats: Most to Least', label: 'Seats: Most to Least' },
                        ]}
                        value={sortBy}
                        onChange={setSortBy}
                        accentColor={accentColor}
                    />
                </div>
                <div className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] font-medium text-[rgba(255,255,255,0.4)] tracking-wide">
                    {filteredCars.length} vehicle{filteredCars.length !== 1 ? 's' : ''} found
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4 space-y-3">
                {filteredCars.length > 0 ? (
                    filteredCars.map(car => (
                        <RentalCarCard 
                            key={car.id} 
                            car={car} 
                            onRent={setSelectedCar} 
                            accentColor={accentColor}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Car size={40} className="text-light-gray/30 mb-2" />
                        <p className="text-sm text-light-gray">No vehicles available in this category.</p>
                    </div>
                )}
            </main>

            {selectedCar && (
                <RentalBookingModal 
                    car={selectedCar}
                    onClose={() => setSelectedCar(null)}
                    onConfirm={handleConfirmBooking}
                    accentColor={accentColor}
                />
            )}

            {showGCashModal && user && (
                <GCashPaymentModal
                    bookingId={bookingId}
                    totalAmount={totalPriceState}
                    paymentAmount={totalPriceState * 0.5}
                    customerName={user.name}
                    isRental={true}
                    newBookingData={gcashBookingData}
                    services={[{ name: `Rent a Car: ${selectedCar?.make || ''} ${selectedCar?.model || ''}`, price: totalPriceState }]}
                    onPaymentVerified={() => {
                        setShowGCashModal(false);
                        setShowSuccessView(true);
                    }}
                    onClose={() => setShowGCashModal(false)}
                />
            )}

            {showSuccessView && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
                    onClick={() => {
                        setShowSuccessView(false);
                        navigate('/customer-portal/bookings');
                    }}
                >
                    <div 
                        className="bg-[#15151A] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Booking Payment Confirmed!</h3>
                        <p className="text-xs text-light-gray mb-6">
                            Your downpayment for the car rental has been verified. You can check the status in your bookings.
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccessView(false);
                                navigate('/customer-portal/bookings');
                            }}
                            className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                            style={{ backgroundColor: accentColor }}
                        >
                            View Bookings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentCarScreen;
