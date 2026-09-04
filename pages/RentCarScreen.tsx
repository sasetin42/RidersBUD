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
import { HitPayService } from '../services/HitPayService';
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="bg-[#121215] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-md animate-scaleUp max-h-[92vh] overflow-y-auto cursor-default shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block" style={{ color: accentColor }}>
                            Rental Booking
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                            {car.make} {car.model}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-light-gray hover:text-white flex items-center justify-center text-xs font-bold transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Car Hero Preview Banner */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0C] aspect-[16/9] w-full shrink-0">
                    <img 
                        src={carImgUrl} 
                        alt={`${car.make} ${car.model}`} 
                        className="w-full h-full object-cover" 
                        width={360}
                        height={200}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                        <div className="flex items-baseline justify-between">
                            <p className="text-base sm:text-lg font-black text-white" style={{ color: accentColor }}>
                                ₱{car.pricePerDay.toLocaleString()}
                                <span className="text-[11px] text-light-gray/80 font-normal ml-1">/ day</span>
                            </p>
                            <span className="text-[10px] font-bold bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/10">
                                {car.year || '2024'} Model
                            </span>
                        </div>
                    </div>
                </div>

                {/* Car Specs Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Users size={11} className="text-primary" />
                        {specs.seats} Seats
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Fuel size={11} className="text-primary" />
                        {specs.fuelType}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Settings size={11} className="text-primary" />
                        {specs.transmission}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Briefcase size={11} className="text-primary" />
                        {specs.baggage} Bags
                    </span>
                </div>

                {/* Modern Date Selection Section */}
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-light-gray/90 flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary" />
                            Rental Duration
                        </label>
                        {duration > 0 && !validationError && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary" style={{ color: accentColor, borderColor: `${accentColor}40` }}>
                                {duration} {duration === 1 ? 'Day' : 'Days'} Total
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="relative">
                            <span className="text-[10px] font-semibold text-light-gray/60 block mb-1">Pick-up Date</span>
                            <div className="relative flex items-center">
                                <Calendar size={13} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: startDate ? accentColor : undefined }} />
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
                                    className={`w-full py-2.5 pl-8 pr-2 bg-[#1A1A1E] border rounded-xl outline-none transition-all text-white text-xs font-medium [color-scheme:dark] ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'
                                    }`} 
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <span className="text-[10px] font-semibold text-light-gray/60 block mb-1">Return Date</span>
                            <div className="relative flex items-center">
                                <Calendar size={13} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: endDate ? accentColor : undefined }} />
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
                                    className={`w-full py-2.5 pl-8 pr-2 bg-[#1A1A1E] border rounded-xl outline-none transition-all text-white text-xs font-medium [color-scheme:dark] ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'
                                    }`} 
                                />
                            </div>
                        </div>
                    </div>

                    {validationError && (
                        <p className="text-red-400 text-xs font-semibold animate-fadeIn pl-1">
                            {validationError}
                        </p>
                    )}
                </div>

                {/* Enhanced Driver Option Cards */}
                <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-light-gray/90 block">Select Driving Mode</span>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIncludeDriver(false)}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                !includeDriver 
                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5' 
                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                            }`}
                            style={!includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${!includeDriver ? 'bg-primary text-white' : 'bg-white/5 text-light-gray/60'}`} style={!includeDriver ? { backgroundColor: accentColor } : {}}>
                                    <Car size={14} />
                                </div>
                                {!includeDriver && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <span className="text-xs font-black block text-white">Self Drive</span>
                                <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">No Extra Fee</span>
                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Valid License Required</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIncludeDriver(true)}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                includeDriver 
                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5' 
                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                            }`}
                            style={includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${includeDriver ? 'bg-primary text-white' : 'bg-white/5 text-light-gray/60'}`} style={includeDriver ? { backgroundColor: accentColor } : {}}>
                                    <UserCheck size={14} />
                                </div>
                                {includeDriver && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <span className="text-xs font-black block text-white">With Driver</span>
                                <span className="text-[10px] font-semibold text-amber-400 block mt-0.5">+₱1,500 / day</span>
                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Vetted Professional</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Segmented Receipt Breakdown Card */}
                <div 
                    className={`overflow-hidden transition-all duration-300 ease-out bg-[#0D0D10] rounded-xl border border-white/5 ${
                        duration > 0 && !validationError 
                            ? 'max-h-[350px] opacity-100 p-3.5 mt-2' 
                            : 'max-h-0 opacity-0 p-0 border-transparent m-0'
                    }`}
                >
                    <div className="space-y-2.5 divide-y divide-white/5">
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-light-gray/80">
                                <span className="flex items-center gap-2 font-medium">
                                    <Car size={12} className="text-primary" />
                                    Base Vehicle Rent ({duration} {duration > 1 ? 'days' : 'day'})
                                </span>
                                <span className="font-bold text-white">₱{basePrice.toLocaleString()}</span>
                            </div>

                            {includeDriver && (
                                <div className="flex justify-between items-center text-light-gray/80 animate-fadeIn">
                                    <span className="flex items-center gap-2 font-medium">
                                        <UserCheck size={12} className="text-teal-400" />
                                        Professional Driver Fee
                                    </span>
                                    <span className="font-bold text-white">₱{driverFee.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-light-gray/80">
                                <span className="flex items-center gap-2 font-medium">
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                    Security Deposit <span className="text-[9px] text-emerald-400 font-bold">(Refundable)</span>
                                </span>
                                <span className="font-bold text-white">₱{securityDeposit.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-2.5 flex justify-between items-baseline">
                            <span className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider">
                                <Receipt size={13} className="text-primary" />
                                Total Estimated
                            </span>
                            <span className="text-lg sm:text-xl font-black" style={{ color: accentColor }}>
                                ₱{totalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs text-center font-semibold">{error}</p>}

                {/* Modal Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition border border-white/5"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onClick={handleConfirm} 
                        disabled={isConfirming || isFormInvalid} 
                        style={{ backgroundColor: isFormInvalid ? 'rgba(255,255,255,0.05)' : accentColor }}
                        className="flex-1 py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20"
                    >
                        {isConfirming ? <Spinner size="sm" /> : 'Confirm Booking'}
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
    const [isExpanded, setIsExpanded] = useState(false);

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
        let fuelType = car.engineType || 'Gasoline';
        let transmission = car.transmission || 'Automatic';
        let baggage = car.baggageCapacity || 2;
        let mileage = car.mileageLimit || 'Unlimited Mileage';
        let insurance = car.insuranceIncluded || 'Comprehensive Insurance';
        let deposit = car.depositAmount || 3000;
        let fuelPolicy = car.fuelPolicy || 'Full to Full';
        
        if (modelLower.includes('montero') || modelLower.includes('fortuner')) {
            seats = car.seats || 7;
            fuelType = 'Diesel';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 3;
        } else if (modelLower.includes('mustang') || modelLower.includes('challenger') || modelLower.includes('camaro')) {
            seats = car.seats || 4;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 2;
        } else if (modelLower.includes('hiace') || modelLower.includes('urvan') || modelLower.includes('starex')) {
            seats = car.seats || 12;
            fuelType = 'Diesel';
            transmission = car.transmission || 'Manual';
            baggage = car.baggageCapacity || 4;
        } else if (modelLower.includes('vios') || modelLower.includes('civic') || modelLower.includes('altis') || modelLower.includes('city') || modelLower.includes('sedan')) {
            seats = car.seats || 5;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 2;
        } else if (modelLower.includes('mirage') || modelLower.includes('wigo') || modelLower.includes('brio') || modelLower.includes('hatchback')) {
            seats = car.seats || 5;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 1;
        }
        
        if (car.seats) seats = car.seats;
        if (car.transmission) transmission = car.transmission;
        if (car.fuelPolicy) {
            if (car.fuelPolicy.toLowerCase().includes('diesel')) {
                fuelType = 'Diesel';
            } else if (car.fuelPolicy.toLowerCase().includes('gas')) {
                fuelType = 'Gasoline';
            }
        }
        
        return { seats, fuelType, transmission, baggage, mileage, insurance, deposit, fuelPolicy };
    }, [car]);

    const defaultFeatures = useMemo(() => {
        if (car.features && car.features.length > 0) return car.features;
        return ['Air Conditioning', 'Bluetooth Audio', 'Touchscreen Infotainment', 'Reverse Camera / Sensors', 'Dual Front Airbags', '24/7 Roadside Assistance'];
    }, [car.features]);

    return (
        <div className="bg-[#141416] rounded-2xl overflow-hidden shadow-lg border border-white/5 hover:border-white/15 transition-all duration-300 animate-fadeIn">
            {/* Top Main Card Section */}
            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3.5">
                {/* Left side: Vehicle Image */}
                <div className="w-full sm:w-36 h-32 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-[#0B0B0C] relative border border-white/5">
                    <img 
                        src={carImgUrl} 
                        alt={`${car.make} ${car.model}`} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                        loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md text-white/90 px-2 py-0.5 rounded border border-white/10">
                            {car.type}
                        </span>
                    </div>
                </div>
                
                {/* Right side: Summary Details */}
                <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                        {/* Header: Name & Availability */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                                    {car.year} {car.make} {car.model}
                                </h3>
                                {car.plateNumber && (
                                    <span className="text-[10px] font-mono text-light-gray/60 tracking-wider">
                                        Plate: {car.plateNumber}
                                    </span>
                                )}
                            </div>
                            
                            {car.isAvailable ? (
                                <span className="shrink-0 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-emerald-950">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Available
                                </span>
                            ) : (
                                <span className="shrink-0 text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    Booked
                                </span>
                            )}
                        </div>
                        
                        {/* Primary Specs Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Users size={11} className="text-primary" />
                                {specs.seats} Seats
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Fuel size={11} className="text-primary" />
                                {specs.fuelType}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Settings size={11} className="text-primary" />
                                {specs.transmission}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Briefcase size={11} className="text-primary" />
                                {specs.baggage} Bags
                            </span>
                        </div>
                    </div>
                    
                    {/* Action Bar: Price + Dropdown Toggle + Rent Button */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-auto">
                        <div>
                            <span className="text-[10px] text-light-gray/60 uppercase font-bold tracking-wider block">Daily Rate</span>
                            <p className="text-lg sm:text-xl font-black leading-none" style={{ color: accentColor }}>
                                ₱{car.pricePerDay.toLocaleString()}
                                <span className="text-[10px] font-normal text-light-gray/70 ml-1">/ day</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(prev => !prev)}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-200 ${
                                    isExpanded 
                                        ? 'bg-white/10 border-white/20 text-white' 
                                        : 'bg-white/5 border-white/5 text-light-gray hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="whitespace-nowrap">{isExpanded ? 'Hide' : 'Details'}</span>
                                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            <button 
                                onClick={() => onRent(car)}
                                disabled={!car.isAvailable}
                                style={car.isAvailable ? { backgroundColor: accentColor } : undefined}
                                className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none whitespace-nowrap shrink-0"
                            >
                                Rent Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Dropdown Details Section */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out border-t ${
                    isExpanded 
                        ? 'max-h-[600px] opacity-100 border-white/10 bg-[#0E0E10] p-4' 
                        : 'max-h-0 opacity-0 border-transparent p-0'
                }`}
            >
                <div className="space-y-4">
                    {/* Vehicle Description */}
                    {car.description && (
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-1">
                                // Overview
                            </span>
                            <p className="text-xs text-light-gray/90 leading-relaxed font-medium">
                                {car.description}
                            </p>
                        </div>
                    )}

                    {/* Extended Technical Specifications Grid */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-2">
                            // Specifications & Policy
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Fuel Policy</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.fuelPolicy}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Mileage Limit</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.mileage}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Insurance</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.insurance}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Security Deposit</span>
                                <span className="font-bold text-white mt-0.5 block">₱{specs.deposit.toLocaleString()} (Refundable)</span>
                            </div>
                        </div>
                    </div>

                    {/* Features & Inclusions */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-2">
                            // Key Features & Equipment
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {defaultFeatures.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-light-gray/90 font-medium">
                                    <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                                    <span className="truncate">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Rent Action Inside Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                        <span className="text-[11px] text-light-gray/70">
                            Available with Optional Professional Driver (+₱1,500/day)
                        </span>
                        <button
                            type="button"
                            onClick={() => onRent(car)}
                            disabled={!car.isAvailable}
                            style={car.isAvailable ? { backgroundColor: accentColor } : undefined}
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                        >
                            Proceed to Booking
                        </button>
                    </div>
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

        const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
        const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

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

        if (!isHitPayActive) {
            throw new Error("Online Payment Gateway (HitPay) is required for rental reservations but currently inactive in system settings. Please contact the administrator.");
        }

        const createdRental = await addRentalBooking(pendingBookingData);
        if (!createdRental) throw new Error("Failed to save rental booking.");

        const hitPay = HitPayService.fromSettings(db?.settings);
        const downpayment = bookingDetails.totalPrice * 0.5;
        const returnUrl = `${window.location.origin}/customer-portal/service-payment?bookingId=${createdRental.id}&isRental=true`;

        sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
            bookingId: createdRental.id,
            amount: downpayment,
            totalAmount: bookingDetails.totalPrice,
            isRental: true
        }));

        const { url } = await hitPay.createPaymentRequest({
            amount: downpayment,
            currency: db?.settings?.currency || 'PHP',
            reference_number: `RNT-${createdRental.id}-${Date.now()}`,
            webhook: 'https://ridersbud-10806.web.app/payment/webhook',
            redirect_url: returnUrl,
            email: user.email || 'customer@example.com',
            name: user.name || 'Customer'
        });

        window.location.href = url;
        return;
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
                        navigate('/customer-portal/');
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
                                navigate('/customer-portal/');
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
