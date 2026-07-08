import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import CustomerHeader from '../../components/CustomerHeader';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Car, Phone, Info, Check, CheckCircle2, User, FileText, AlertCircle } from 'lucide-react';
import Spinner from '../../components/Spinner';

interface FormState {
    pickupLocation: string;
    destination: string;
    date: string;
    time: string;
    duration: string;
    vehicleType: string;
    driveCustomerCar: boolean;
    vehicleBrand: string;
    vehicleModel: string;
    plateNumber: string;
    contactNumber: string;
    specialInstructions: string;
}

const DriverBookingFlow: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { user } = useAuth();
    const { db, addServiceRequest } = useDatabase();
    const navigate = useNavigate();

    const accentColor = db?.settings?.accentColor || '#FE7803';

    // State Variables
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [form, setForm] = useState<FormState>({
        pickupLocation: '',
        destination: '',
        date: '',
        time: '08:00 AM',
        duration: '8 Hours (Full Day)',
        vehicleType: 'Sedan',
        driveCustomerCar: true,
        vehicleBrand: '',
        vehicleModel: '',
        plateNumber: '',
        contactNumber: user?.phone || '',
        specialInstructions: ''
    });

    useEffect(() => {
        if (user?.phone) {
            setForm(prev => ({ ...prev, contactNumber: user.phone }));
        }
    }, [user]);

    const totalSteps = 3;

    // Helper: Form validation per step
    const isStepValid = () => {
        if (currentStep === 1) return true;
        if (currentStep === 2) {
            const hasBasic = form.pickupLocation.trim() !== '' &&
                             form.destination.trim() !== '' &&
                             form.date !== '' &&
                             form.contactNumber.trim() !== '';
            
            if (form.driveCustomerCar) {
                return hasBasic && form.vehicleBrand.trim() !== '' && form.vehicleModel.trim() !== '' && form.plateNumber.trim() !== '';
            }
            return hasBasic;
        }
        return true;
    };

    const handleNext = () => {
        if (isStepValid() && currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            navigate(-1);
        }
    };

    const calculateEstimatedFee = () => {
        if (form.duration.includes('Hourly') || form.duration.includes('2 Hours')) {
            return 1600; // 2 hrs minimum * 800
        } else if (form.duration.includes('4 Hours')) {
            return 3200;
        } else if (form.duration.includes('8 Hours') || form.duration.includes('Full Day')) {
            return 4500;
        } else {
            return 5500; // Airport transfer or out-of-town
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const requestPayload = {
                customerId: user.id,
                customerName: user.name,
                customerPhone: form.contactNumber,
                customerEmail: user.email || '',
                serviceId: '7',
                serviceName: 'Driver for Hire',
                status: 'Pending Admin Review',
                scheduledDate: form.date,
                notes: form.specialInstructions,
                totalAmount: calculateEstimatedFee(),
                vehicleDetails: form.driveCustomerCar ? {
                    brand: form.vehicleBrand,
                    model: form.vehicleModel,
                    plateNumber: form.plateNumber,
                    type: form.vehicleType
                } : null,
                details: {
                    pickupLocation: form.pickupLocation,
                    destination: form.destination,
                    time: form.time,
                    duration: form.duration,
                    vehicleType: form.vehicleType,
                    driveCustomerCar: form.driveCustomerCar
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await addServiceRequest(requestPayload);
            navigate('/');
        } catch (error) {
            console.error('Failed to submit Driver for Hire request:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Custom Calendar Date Selection Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const daysArray = [];
        for (let i = 1; i <= days; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return daysArray;
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    };

    const formatReadableDate = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const days = getDaysInMonth(currentMonth);
    const startDayOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#111113]">
                <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-black uppercase tracking-wider">Driver for Hire</h1>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Flow Wizard • Step {currentStep} of {totalSteps}</p>
                </div>
            </header>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-[#111113] px-6 py-2 border-b border-white/5 flex items-center gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                        key={i} 
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ 
                            backgroundColor: i + 1 <= currentStep ? accentColor : 'rgba(255,255,255,0.05)' 
                        }}
                    />
                ))}
            </div>

            {/* Content Area */}
            <main className="flex-grow p-6 pb-24 overflow-y-auto max-w-lg mx-auto w-full">
                {/* Step 1: Welcome / Description */}
                {currentStep === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10">
                            <img 
                                src="https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/driver_hero.png" 
                                alt="Driver Hero" 
                                className="w-full h-44 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                <span className="bg-primary text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: accentColor }}>Special Services</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-black uppercase tracking-tight">Driver for Hire</h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Need a designated driver, airport transfer, or chauffeur for long out-of-town road trips? Book a vetted, professional driver on demand.
                            </p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 space-y-3.5">
                            <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Service Requirements</h3>
                            <ul className="space-y-2.5">
                                <li className="flex items-start gap-2.5 text-xs text-gray-400">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                                    <span>Valid driver's license matching vehicle class.</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs text-gray-400">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                                    <span>Vehicle registration and active insurance policy.</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs text-gray-400">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                                    <span>Customer matches vehicle type requirements.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Trip & Vehicle Details */}
                {currentStep === 2 && (
                    <div className="space-y-5 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-1">Trip Details</h2>
                            <p className="text-xs text-gray-400">Please provide precise schedule and location information.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Pick up & Destination */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pick-Up Location *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                        <input 
                                            type="text"
                                            value={form.pickupLocation}
                                            onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))}
                                            placeholder="Enter pick-up address/area"
                                            className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destination *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                        <input 
                                            type="text"
                                            value={form.destination}
                                            onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                                            placeholder="Enter destination address/area"
                                            className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Date Picker trigger */}
                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preferred Appointment Date *</label>
                                <button
                                    onClick={() => setShowCalendar(!showCalendar)}
                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white flex items-center justify-between text-left focus:border-primary/50 transition-colors"
                                >
                                    <span className={form.date ? 'text-white font-bold' : 'text-gray-500'}>
                                        {form.date ? formatReadableDate(form.date) : 'Choose date from calendar'}
                                    </span>
                                    <Calendar className="text-gray-400" size={16} />
                                </button>

                                {/* Custom Calendar Picker Overlay */}
                                {showCalendar && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#151518] border border-white/10 rounded-2xl p-4 z-50 shadow-2xl animate-scaleUp">
                                        <div className="flex justify-between items-center mb-3">
                                            <button 
                                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                                className="p-1 hover:bg-white/5 rounded"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <h4 className="text-xs font-black uppercase text-white tracking-wider">
                                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </h4>
                                            <button 
                                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                                className="p-1 hover:bg-white/5 rounded"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500 font-bold uppercase mb-2">
                                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: startDayOffset }).map((_, idx) => (
                                                <div key={`offset-${idx}`} />
                                            ))}
                                            {days.map((day, idx) => {
                                                const formatted = day.toISOString().split('T')[0];
                                                const active = form.date === formatted;
                                                const past = isPastDate(day);
                                                const weekend = isWeekend(day);
                                                const disabled = past || weekend;

                                                return (
                                                    <button
                                                        key={idx}
                                                        disabled={disabled}
                                                        onClick={() => {
                                                            setForm(f => ({ ...f, date: formatted }));
                                                            setShowCalendar(false);
                                                        }}
                                                        className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                                                            active 
                                                                ? 'bg-primary text-white font-black' 
                                                                : disabled 
                                                                    ? 'text-white/10 cursor-not-allowed' 
                                                                    : 'text-white hover:bg-white/5'
                                                        }`}
                                                        style={{ backgroundColor: active ? accentColor : undefined }}
                                                    >
                                                        {day.getDate()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-3.5 pt-2.5 border-t border-white/5 flex gap-4 text-[9px] text-gray-500 justify-center">
                                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#FE7803]" style={{ backgroundColor: accentColor }} /> Selected</span>
                                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-white/10" /> Weekend (Rest)</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Duration & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Departure Time *</label>
                                    <select
                                        value={form.time}
                                        onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                        className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                    >
                                        <option value="06:00 AM">06:00 AM</option>
                                        <option value="08:00 AM">08:00 AM</option>
                                        <option value="10:00 AM">10:00 AM</option>
                                        <option value="12:00 PM">12:00 PM</option>
                                        <option value="02:00 PM">02:00 PM</option>
                                        <option value="04:00 PM">04:00 PM</option>
                                        <option value="06:00 PM">06:00 PM</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Duration *</label>
                                    <select
                                        value={form.duration}
                                        onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                                        className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                    >
                                        <option value="2 Hours (Minimum)">2 Hours (Minimum)</option>
                                        <option value="4 Hours">4 Hours</option>
                                        <option value="8 Hours (Full Day)">8 Hours (Full Day)</option>
                                        <option value="Multiple Days">Multiple Days</option>
                                    </select>
                                </div>
                            </div>

                            {/* Drive Customer Car Toggle */}
                            <div className="p-4 bg-[#111113] border border-white/5 rounded-2xl flex items-center justify-between">
                                <div className="flex gap-3 items-center">
                                    <Car size={16} className="text-gray-400" />
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Drive My Own Vehicle</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">The driver will operate your vehicle.</p>
                                    </div>
                                </div>
                                <input 
                                    type="checkbox"
                                    checked={form.driveCustomerCar}
                                    onChange={e => setForm(f => ({ ...f, driveCustomerCar: e.target.checked }))}
                                    className="accent-primary w-4 h-4 rounded border-white/10"
                                    style={{ accentColor }}
                                />
                            </div>

                            {/* Customer Vehicle Inputs */}
                            {form.driveCustomerCar && (
                                <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-3.5 animate-fadeIn">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Brand *</label>
                                            <input 
                                                type="text"
                                                value={form.vehicleBrand}
                                                onChange={e => setForm(f => ({ ...f, vehicleBrand: e.target.value }))}
                                                placeholder="e.g. Toyota"
                                                className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Model *</label>
                                            <input 
                                                type="text"
                                                value={form.vehicleModel}
                                                onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))}
                                                placeholder="e.g. Vios"
                                                className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Plate Number *</label>
                                            <input 
                                                type="text"
                                                value={form.plateNumber}
                                                onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))}
                                                placeholder="e.g. ABC 123"
                                                className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white uppercase focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Type *</label>
                                            <select
                                                value={form.vehicleType}
                                                onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                                                className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                            >
                                                <option value="Sedan">Sedan</option>
                                                <option value="SUV">SUV</option>
                                                <option value="Van">Van</option>
                                                <option value="Pickup">Pickup</option>
                                                <option value="Motorcycle">Motorcycle</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Contact Number */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                    <input 
                                        type="tel"
                                        value={form.contactNumber}
                                        onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                                        placeholder="Enter active phone number"
                                        className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Special Instructions */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Special Instructions / Remarks</label>
                                <textarea
                                    value={form.specialInstructions}
                                    onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                                    placeholder="Enter trip schedule specifics, extra requests, or driving preferences..."
                                    rows={3}
                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Review Details */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Review Summary</h2>
                            <p className="text-xs text-gray-400">Ensure all details are correct before final submission.</p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-4">
                            {/* Trip Locations */}
                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPin size={15} style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Route Information</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{form.pickupLocation}</h4>
                                    <span className="text-[9px] text-gray-500 block my-1">to</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{form.destination}</h4>
                                </div>
                            </div>

                            {/* Schedule & Duration */}
                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Calendar size={15} style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Schedule Details</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{formatReadableDate(form.date)}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1">Time: {form.time} · Duration: {form.duration}</p>
                                </div>
                            </div>

                            {/* Vehicle details */}
                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Car size={15} style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Operating Vehicle</span>
                                    {form.driveCustomerCar ? (
                                        <>
                                            <h4 className="font-bold text-[12px] text-white leading-tight">{form.vehicleBrand} {form.vehicleModel}</h4>
                                            <p className="text-[10px] text-gray-500 mt-1">Plate No: <span className="font-mono bg-white/5 px-1 rounded text-white">{form.plateNumber}</span> · Type: {form.vehicleType}</p>
                                        </>
                                    ) : (
                                        <h4 className="font-bold text-[12px] text-white leading-tight">Driver will provide vehicle ({form.vehicleType})</h4>
                                    )}
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Phone size={15} style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Customer Contact</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{user?.name}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1">Phone: {form.contactNumber}</p>
                                </div>
                            </div>

                            {/* Notes */}
                            {form.specialInstructions && (
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Info size={15} style={{ color: accentColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Remarks / Instructions</span>
                                        <p className="text-[10px] text-gray-400 leading-normal mt-1" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{form.specialInstructions}</p>
                                    </div>
                                </div>
                            )}

                            {/* Estimated Fee */}
                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-medium">Estimated Service Fee</span>
                                <span className="text-lg font-black text-white">₱{calculateEstimatedFee().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Actions Sticky bar */}
            <div className="fixed bottom-0 left-0 w-full bg-[#111113] border-t border-white/5 p-4 z-50">
                <div className="max-w-lg mx-auto flex gap-4">
                    {currentStep < totalSteps ? (
                        <button 
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className="flex-1 hover:opacity-90 disabled:bg-white/5 disabled:text-white/30 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                            style={{ backgroundColor: isStepValid() ? accentColor : undefined }}
                        >
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                            style={{ backgroundColor: accentColor }}
                        >
                            {submitting ? <Spinner size="sm" /> : 'Confirm Booking'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverBookingFlow;
