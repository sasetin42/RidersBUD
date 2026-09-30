import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { 
    CheckCircle2, Calendar, Clock, MapPin, Car, User, 
    CreditCard, ShieldCheck, ChevronRight, Home, Phone, 
    Sparkles, ArrowRight, Truck, FileText, Wrench, Award,
    CheckCircle, Navigation
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

type ServiceKind = 'driver' | 'rental' | 'towing' | 'liaison' | 'mechanic' | 'general';

const ServicePaymentConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const { booking } = (location.state as { booking: any }) || {};

    React.useEffect(() => {
        if (!booking) {
            navigate('/customer-portal/', { replace: true });
        }
    }, [booking, navigate]);

    if (!booking) {
        return null;
    }

    const accentColor = db?.settings?.accentColor || '#FE7803';

    // 1. Resolve effective service list and names
    const services = booking.services || (booking.service ? [booking.service] : []);
    const rawServiceName = booking.serviceName || (services.length > 0 ? services.map((s: any) => s.name).join(', ') : 'Special Service');
    const basePrice = services.reduce((total: number, s: any) => total + (s.price || 0), 0);
    const totalAmount = Number(booking.totalAmount || booking.totalPrice || basePrice) || 0;
    const paidAmount = Number(booking.paidAmount != null ? booking.paidAmount : (booking.downpaymentAmount || totalAmount)) || 0;
    const remainingBalance = Math.max(0, totalAmount - paidAmount);

    const isFullyPaid = booking.isPaid === true || paidAmount >= (totalAmount - 0.5);
    const isDownpayment = !isFullyPaid && paidAmount > 0;

    // 2. Identify the service category / kind
    const serviceKind: ServiceKind = useMemo(() => {
        if (booking.isDriver || booking.isDriverHire) return 'driver';
        if (booking.isRental) return 'rental';

        const nameLower = (rawServiceName + ' ' + (booking.category || '') + ' ' + (booking.slug || '')).toLowerCase();
        if (nameLower.includes('driver') || nameLower.includes('chauffeur')) return 'driver';
        if (nameLower.includes('rent') || nameLower.includes('rental') || nameLower.includes('car hire')) return 'rental';
        if (nameLower.includes('towing') || nameLower.includes('rescue') || nameLower.includes('flatbed')) return 'towing';
        if (nameLower.includes('liaison') || nameLower.includes('lto') || nameLower.includes('registration') || nameLower.includes('transfer of ownership')) return 'liaison';
        if (nameLower.includes('mechanic') || nameLower.includes('repair') || nameLower.includes('maintenance') || nameLower.includes('oil change') || nameLower.includes('tune')) return 'mechanic';
        return 'general';
    }, [booking, rawServiceName]);

    // 3. Service-Adaptive metadata and specialist role mapping
    const serviceMeta = useMemo(() => {
        switch (serviceKind) {
            case 'driver': {
                const driverName = booking.driverName || booking.details?.selectedDriverName || booking.assignedDriverName || 'Professional Chauffeur';
                const purpose = booking.purposeOfHire || booking.details?.purposeOfHire || 'Chauffeur Booking';
                return {
                    badgeLabel: 'Driver for Hire',
                    badgeIcon: <Award size={14} className="text-amber-400" />,
                    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    staffRole: 'Assigned Driver',
                    staffName: driverName,
                    staffPhone: booking.driverPhone || booking.details?.driverPhone || null,
                    heroMessage: `Your Driver for Hire reservation #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} is now paid. Your assigned driver has been notified and will coordinate with you shortly.`,
                    purposeLabel: 'Purpose of Hire',
                    purposeValue: purpose,
                    refPrefix: 'DRV'
                };
            }
            case 'rental': {
                const carModel = booking.carName || booking.vehicleModel || (booking.car ? `${booking.car.brand || ''} ${booking.car.model || ''}`.trim() : 'Rental Vehicle Fleet');
                return {
                    badgeLabel: 'Car Rental',
                    badgeIcon: <Car size={14} className="text-emerald-400" />,
                    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    staffRole: 'Fleet Coordinator',
                    staffName: 'Rental Dispatch Team',
                    staffPhone: db?.settings?.contactPhone || null,
                    heroMessage: isDownpayment 
                        ? `Your 50% reservation deposit for car rental booking #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} has been received. Your vehicle is reserved!`
                        : `Your car rental booking #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} is fully paid. The fleet operations team has been notified to prepare your vehicle.`,
                    purposeLabel: 'Vehicle Reserved',
                    purposeValue: carModel,
                    refPrefix: 'RNT'
                };
            }
            case 'towing': {
                return {
                    badgeLabel: 'Emergency Towing',
                    badgeIcon: <Truck size={14} className="text-rose-400" />,
                    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    staffRole: 'Tow Specialist',
                    staffName: booking.operatorName || 'Emergency Dispatch Unit',
                    staffPhone: db?.settings?.contactPhone || null,
                    heroMessage: `Your emergency towing request #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} has been prioritized and paid. The towing dispatch operator has been alerted.`,
                    purposeLabel: 'Towing Assistance',
                    purposeValue: booking.notes || 'Emergency Roadside Dispatch',
                    refPrefix: 'TOW'
                };
            }
            case 'liaison': {
                return {
                    badgeLabel: 'Liaison Assistance',
                    badgeIcon: <FileText size={14} className="text-indigo-400" />,
                    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                    staffRole: 'Liaison Officer',
                    staffName: booking.officerName || 'LTO Liaison Officer',
                    staffPhone: db?.settings?.contactPhone || null,
                    heroMessage: `Your Liaison Assistance booking #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} is confirmed and paid. Your assigned liaison officer will review your documents.`,
                    purposeLabel: 'LTO Service',
                    purposeValue: booking.serviceType || rawServiceName,
                    refPrefix: 'LIA'
                };
            }
            case 'mechanic': {
                const mechanicName = booking.mechanic?.name || booking.mechanicName || 'Certified Mechanic';
                return {
                    badgeLabel: 'Auto Repair Service',
                    badgeIcon: <Wrench size={14} className="text-orange-400" />,
                    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                    staffRole: 'Certified Mechanic',
                    staffName: mechanicName,
                    staffPhone: booking.mechanic?.phone || null,
                    heroMessage: `Your booking #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} is now paid. The mechanic has been notified to proceed with your service.`,
                    purposeLabel: 'Service Scope',
                    purposeValue: rawServiceName,
                    refPrefix: 'BOK'
                };
            }
            default: {
                return {
                    badgeLabel: 'Special Service',
                    badgeIcon: <Sparkles size={14} className="text-blue-400" />,
                    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    staffRole: 'Service Coordinator',
                    staffName: 'Support Team',
                    staffPhone: db?.settings?.contactPhone || null,
                    heroMessage: `Your request #${booking.id ? booking.id.slice(-6).toUpperCase() : 'CONFIRMED'} is now paid and confirmed. Our team has been notified.`,
                    purposeLabel: 'Service Details',
                    purposeValue: rawServiceName,
                    refPrefix: 'REQ'
                };
            }
        }
    }, [serviceKind, booking, rawServiceName, db?.settings?.contactPhone]);

    // 4. Resolve Locations (Pickup, Destination, Drop-off)
    const pickupLoc = booking.pickupLocation || booking.location?.address || booking.details?.pickupLocation || (booking.location ? `${booking.location.latitude?.toFixed(4)}, ${booking.location.longitude?.toFixed(4)}` : null);
    const destLoc = booking.destination || booking.dropoffLocation || booking.details?.destination || null;

    // 5. Resolve Dates & Times
    const scheduleDate = booking.scheduledDate || booking.date || (booking.startDate ? `${booking.startDate} to ${booking.endDate}` : null);
    const scheduleTime = booking.time || booking.details?.time || null;
    const duration = booking.duration || booking.details?.duration || (booking.totalDays ? `${booking.totalDays} Day(s)` : null);

    // 6. Resolve Vehicle details
    const vehicleInfo = useMemo(() => {
        if (booking.vehicleDetails) {
            const v = booking.vehicleDetails;
            return `${v.year || ''} ${v.make || v.brand || ''} ${v.model || ''} (${v.plateNumber || 'No Plate'})`.trim();
        }
        if (booking.vehicle) {
            const v = booking.vehicle;
            return `${v.year || ''} ${v.make || ''} ${v.model || ''} (${v.plateNumber || 'No Plate'})`.trim();
        }
        if (booking.carName) {
            return `${booking.carName} ${booking.plateNumber ? `(${booking.plateNumber})` : ''}`.trim();
        }
        return null;
    }, [booking]);

    // 7. Reference Number Formatter
    const refCode = booking.referenceNumber || booking.id ? `#${serviceMeta.refPrefix}-${booking.id.slice(-6).toUpperCase()}` : '#RB-PAID';
    const paymentRef = booking.balancePaymentRef || booking.downpaymentRef || booking.hitpayReference || booking.reference || null;
    const paymentMethodLabel = booking.paymentMethod || 'Online Payment';

    return (
        <div className="flex flex-col min-h-screen bg-[#0F0F12] text-white">
            <CustomerHeader 
                title="Payment Confirmed" 
                icon={<CheckCircle2 size={20} className="text-emerald-400" />} 
                showBackButton={false}
            />

            <div className="flex-grow flex flex-col p-4 sm:p-6 space-y-4 max-w-lg mx-auto w-full overflow-y-auto pb-24">
                {/* Hero Success Badge */}
                <div className="text-center pt-2 pb-1">
                    <div className="relative inline-block mb-3">
                        <div 
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border transition-transform duration-300 animate-fadeIn"
                            style={{ 
                                backgroundColor: `${accentColor}18`, 
                                borderColor: `${accentColor}40`,
                                boxShadow: `0 10px 30px ${accentColor}25`
                            }}
                        >
                            <CheckCircle size={42} style={{ color: accentColor }} />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0F0F12] flex items-center justify-center text-white">
                            <ShieldCheck size={14} />
                        </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10`, color: accentColor }}>
                        {serviceMeta.badgeIcon}
                        <span>{serviceMeta.badgeLabel}</span>
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tight">Payment Successful!</h2>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
                        {serviceMeta.heroMessage}
                    </p>
                </div>

                {/* Main Detailed Receipt Card */}
                <div className="bg-[#17171C] rounded-2xl border border-white/10 p-4 sm:p-5 shadow-2xl space-y-4">
                    {/* Header Row: Ref and Status */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block leading-none mb-1">
                                Reference Number
                            </span>
                            <span className="text-sm font-black text-white font-mono tracking-wider">
                                {refCode}
                            </span>
                        </div>

                        <div className="text-right">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block leading-none mb-1">
                                Payment Status
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 border ${
                                isFullyPaid 
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                {isFullyPaid ? 'Fully Paid' : '50% DP Paid'}
                            </span>
                        </div>
                    </div>

                    {/* Financial Breakdown Table */}
                    <div className="bg-[#121215] rounded-xl p-3.5 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Service:</span>
                            <span className="font-bold text-white max-w-[200px] truncate text-right">{rawServiceName}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{serviceMeta.purposeLabel}:</span>
                            <span className="font-semibold text-gray-200 max-w-[200px] truncate text-right">{serviceMeta.purposeValue}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Payment Method:</span>
                            <span className="font-semibold text-gray-200 flex items-center gap-1">
                                <CreditCard size={12} className="text-gray-400" />
                                {paymentMethodLabel}
                            </span>
                        </div>

                        {paymentRef && (
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Transaction ID:</span>
                                <span className="font-mono text-[11px] text-gray-400 max-w-[180px] truncate">{paymentRef}</span>
                            </div>
                        )}

                        {totalAmount > 0 && isDownpayment && (
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Total Service Fee:</span>
                                <span className="font-bold text-white whitespace-nowrap">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                            <div className="min-w-0 flex-1 mr-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                                    {isDownpayment ? 'Amount Paid (50% Deposit)' : 'Total Paid'}
                                </span>
                                {remainingBalance > 0 && (
                                    <span className="text-[9px] text-amber-400 font-semibold block mt-0.5 truncate">
                                        Remaining Balance: ₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                )}
                            </div>
                            <span className="text-xl font-black text-primary whitespace-nowrap flex-shrink-0" style={{ color: accentColor }}>
                                ₱{paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Service Itinerary / Locations Details */}
                    {(pickupLoc || destLoc || scheduleDate || scheduleTime || duration) && (
                        <div className="bg-[#121215] rounded-xl p-3.5 border border-white/5 space-y-3">
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <Navigation size={13} style={{ color: accentColor }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Schedule & Location</span>
                            </div>

                            {/* Schedule Chips */}
                            {(scheduleDate || scheduleTime || duration) && (
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    {scheduleDate && (
                                        <span className="bg-white/5 border border-white/5 text-[11px] font-semibold text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                            <Calendar size={12} className="text-gray-400" />
                                            {scheduleDate}
                                        </span>
                                    )}
                                    {scheduleTime && (
                                        <span className="bg-white/5 border border-white/5 text-[11px] font-semibold text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                            <Clock size={12} className="text-gray-400" />
                                            {scheduleTime}
                                        </span>
                                    )}
                                    {duration && (
                                        <span className="bg-white/5 border border-white/5 text-[11px] font-semibold text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                            <Sparkles size={12} style={{ color: accentColor }} />
                                            {duration}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Pickup and Destination Route */}
                            {(pickupLoc || destLoc) && (
                                <div className="space-y-2 pt-1 border-t border-white/5">
                                    {pickupLoc && (
                                        <div className="flex items-start gap-2.5 text-xs">
                                            <span className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={11} />
                                            </span>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-0.5">
                                                    Pickup Point
                                                </span>
                                                <p className="text-gray-200 leading-snug break-words">{pickupLoc}</p>
                                            </div>
                                        </div>
                                    )}

                                    {destLoc && (
                                        <div className="flex items-start gap-2.5 text-xs">
                                            <span className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={11} />
                                            </span>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-0.5">
                                                    Destination / Drop-off
                                                </span>
                                                <p className="text-gray-200 leading-snug break-words">{destLoc}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assigned Specialist / Driver Card */}
                    <div className="bg-[#121215] rounded-xl p-3.5 border border-white/5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0" style={{ color: accentColor }}>
                                {serviceMeta.badgeIcon}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-1">
                                    {serviceMeta.staffRole}
                                </span>
                                <h4 className="text-xs font-black text-white truncate">
                                    {serviceMeta.staffName}
                                </h4>
                                {serviceMeta.staffPhone && (
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Phone size={10} /> {serviceMeta.staffPhone}
                                    </p>
                                )}
                            </div>
                        </div>

                        <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider shrink-0">
                            Active Dispatch
                        </span>
                    </div>

                    {/* Vehicle info (if applicable) */}
                    {vehicleInfo && (
                        <div className="bg-[#121215] rounded-xl p-3 border border-white/5 flex items-center gap-2.5 text-xs text-gray-300">
                            <Car size={15} className="text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Assigned Vehicle</span>
                                <span className="font-semibold text-white truncate block">{vehicleInfo}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                    <button
                        onClick={() => {
                            const targetId = booking.id || 
                                             booking.bookingId || 
                                             booking.referenceNumber || 
                                             booking.refCode || 
                                             (booking.reference ? String(booking.reference).replace(/^REF-/, '') : '') ||
                                             (booking.hitpayReference ? String(booking.hitpayReference) : '');
                            if (targetId) {
                                const isLiaisonBooking = serviceKind === 'liaison' || booking.isLiaison;
                                const isRentalBooking = serviceKind === 'rental' || booking.isRental;
                                const isDriverBooking = serviceKind === 'driver' || booking.isDriver || booking.isDriverHire;
                                
                                const queryParams = new URLSearchParams();
                                if (isLiaisonBooking) queryParams.set('isLiaison', 'true');
                                if (isRentalBooking) queryParams.set('isRental', 'true');
                                if (isDriverBooking) queryParams.set('isDriver', 'true');
                                
                                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                                
                                navigate(`/customer-portal/booking-detail/${targetId}${queryString}`, {
                                    state: { 
                                        fromPaymentSuccess: true, 
                                        booking: {
                                            ...booking,
                                            isLiaison: isLiaisonBooking,
                                            isRental: isRentalBooking,
                                            isDriverHire: isDriverBooking
                                        } 
                                    }
                                });
                            } else {
                                navigate('/customer-portal/');
                            }
                        }}
                        className="w-full text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99]"
                        style={{ 
                            backgroundColor: accentColor,
                            boxShadow: `0 4px 20px ${accentColor}35`
                        }}
                    >
                        <span>View Booking Details</span>
                        <ChevronRight size={16} />
                    </button>

                    <button
                        onClick={() => navigate('/customer-portal/', { replace: true })}
                        className="w-full bg-[#18181C] hover:bg-white/5 text-gray-300 font-bold text-xs uppercase tracking-wider py-3 rounded-xl border border-white/10 transition flex items-center justify-center gap-2"
                    >
                        <Home size={14} />
                        <span>Back to Home</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServicePaymentConfirmationScreen;
