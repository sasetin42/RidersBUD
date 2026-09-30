import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ChevronRight, CheckCircle, Car, Calendar, MapPin, FileText, Camera, CreditCard, ShieldCheck } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { ServiceRequest } from '../../types';
import { HitPayService } from '../../services/HitPayService';

const ServiceBookingFlow: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { db, loading, addServiceRequest } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [scheduledDate, setScheduledDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
                <Spinner size="lg" />
            </div>
        );
    }

    const service = db?.appServices?.find(s => s.id === slug || s.slug === slug);
    const vehicles = user?.vehicles || [];

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
                <h1 className="text-2xl font-black">Service Not Found</h1>
                <button onClick={() => navigate('/customer-portal/app-services')} className="mt-6 text-[#E62E00] font-bold">Back</button>
            </div>
        );
    }

    const totalSteps = 4;
    const isTowing = service.name.toLowerCase().includes('towing') || service.category?.toLowerCase().includes('towing') || slug === 'towing';
    const totalPrice = Number(service.price) || (isTowing ? 3500 : 1500);
    const downpaymentAmount = totalPrice * 0.5;

    const handleNext = () => {
        if (currentStep < totalSteps) setCurrentStep(s => s + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(s => s - 1);
        else navigate(-1);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const isHitPayActive = HitPayService.isGatewayActive(db?.settings);
            
            if (isTowing && !isHitPayActive) {
                throw new Error("Online Payment Gateway (HitPay) is required for Towing requests but is currently inactive in system settings. Please contact the administrator.");
            }

            const request: Omit<ServiceRequest, 'id'> = {
                customerId: user.id,
                customerName: user.name,
                serviceId: service.id,
                serviceName: service.name,
                status: isTowing ? 'Pending' : 'Pending',
                details: {
                    ...dynamicFields,
                    totalAmount: totalPrice,
                    downpaymentAmount: downpaymentAmount,
                    paidAmount: isTowing ? downpaymentAmount : 0,
                    paymentStatus: isTowing ? 'partial' : 'Pending',
                    paymentMethod: isTowing ? 'Online (HitPay)' : 'Cash / Direct'
                },
                vehicleId: selectedVehicle,
                scheduledDate,
                notes,
                price: totalPrice,
                totalAmount: totalPrice,
                paidAmount: isTowing ? downpaymentAmount : 0,
                paymentStatus: isTowing ? 'partial' : 'Pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const createdRequest = await addServiceRequest(request);

            if (isTowing && createdRequest && isHitPayActive) {
                const hitPay = HitPayService.fromSettings(db?.settings);
                const returnUrl = `${window.location.origin}/customer-portal/service-payment?bookingId=${createdRequest.id || ''}&isServiceRequest=true`;

                sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                    bookingId: createdRequest.id,
                    amount: downpaymentAmount,
                    totalAmount: totalPrice,
                    currentPaid: 0,
                    isServiceRequest: true,
                    isTowing: true,
                    leavingTimestamp: Date.now(),
                    fullBooking: {
                        ...request,
                        id: createdRequest.id,
                        isServiceRequest: true,
                        isTowing: true,
                        totalAmount: totalPrice,
                        paidAmount: 0,
                        services: [{ name: `Towing Service: ${service.name}`, price: totalPrice }]
                    }
                }));

                const { url } = await hitPay.createPaymentRequest({
                    amount: downpaymentAmount,
                    currency: db?.settings?.currency || 'PHP',
                    reference_number: `TOW-${createdRequest.id || Date.now()}`,
                    webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                    redirect_url: returnUrl,
                    email: user.email || 'customer@example.com',
                    name: user.name || 'Customer',
                    phone: user.phone || undefined,
                    purpose: `RidersBUD — Emergency Towing 50% Deposit (${service.name})`
                });

                if (url.startsWith('/')) {
                    navigate(url);
                } else {
                    window.location.href = url;
                }
                return;
            }

            navigate('/customer-portal/my-service-requests', { replace: true });
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'Failed to submit service request.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderDynamicFields = () => {
        const nameLower = service.name.toLowerCase();

        if (nameLower.includes('towing')) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="service-pickup" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Pickup Location</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input id="service-pickup" name="service-pickup" type="text" value={dynamicFields.pickup || ''} onChange={e => setDynamicFields({...dynamicFields, pickup: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm pl-10 pr-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" placeholder="Current address" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="service-dropoff" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Dropoff Location</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input id="service-dropoff" name="service-dropoff" type="text" value={dynamicFields.dropoff || ''} onChange={e => setDynamicFields({...dynamicFields, dropoff: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm pl-10 pr-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" placeholder="Destination address" />
                        </div>
                    </div>
                </div>
            );
        }
        
        if (nameLower.includes('rent')) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="service-car-type" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Preferred Car Type</label>
                        <select id="service-car-type" name="service-car-type" value={dynamicFields.carType || ''} onChange={e => setDynamicFields({...dynamicFields, carType: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors">
                            <option value="">Select a type...</option>
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="Van">Van / Minivan</option>
                            <option value="Pickup">Pickup Truck</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="service-end-date" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Rental End Date</label>
                        <input id="service-end-date" name="service-end-date" type="date" value={dynamicFields.endDate || ''} onChange={e => setDynamicFields({...dynamicFields, endDate: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" />
                    </div>
                </div>
            );
        }

        if (nameLower.includes('registration')) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="service-reg-type" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Registration Type</label>
                        <select id="service-reg-type" name="service-reg-type" value={dynamicFields.regType || ''} onChange={e => setDynamicFields({...dynamicFields, regType: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors">
                            <option value="">Select type...</option>
                            <option value="Renewal">Renewal</option>
                            <option value="New">New Registration</option>
                            <option value="Transfer">Transfer of Ownership</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="service-lto-branch" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Preferred LTO Branch</label>
                        <input id="service-lto-branch" name="service-lto-branch" type="text" value={dynamicFields.ltoBranch || ''} onChange={e => setDynamicFields({...dynamicFields, ltoBranch: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" placeholder="e.g. LTO Quezon City" />
                    </div>
                </div>
            );
        }

        if (nameLower.includes('body repair') || nameLower.includes('paint')) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="service-damage" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Damage Description</label>
                        <textarea id="service-damage" name="service-damage" value={dynamicFields.damageDesc || ''} onChange={e => setDynamicFields({...dynamicFields, damageDesc: e.target.value})} rows={3} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors resize-none" placeholder="Describe the dents, scratches, or parts needing repair..." />
                    </div>
                    <div className="border border-dashed border-white/20 p-6 flex flex-col items-center justify-center bg-[#111] cursor-pointer hover:bg-white/5 transition-colors">
                        <Camera size={24} className="text-gray-500 mb-2" />
                        <span className="text-xs text-gray-400 font-bold">Upload Photos of Damage</span>
                        <span className="text-[10px] text-gray-600">(Mock upload)</span>
                    </div>
                </div>
            );
        }

        if (nameLower.includes('driver')) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="service-route" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Destination / Route</label>
                        <input id="service-route" name="service-route" type="text" value={dynamicFields.route || ''} onChange={e => setDynamicFields({...dynamicFields, route: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" placeholder="e.g. Metro Manila to Baguio" />
                    </div>
                    <div>
                        <label htmlFor="service-duration" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Estimated Hours/Days</label>
                        <input id="service-duration" name="service-duration" type="text" value={dynamicFields.duration || ''} onChange={e => setDynamicFields({...dynamicFields, duration: e.target.value})} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors" placeholder="e.g. 8 Hours or 2 Days" />
                    </div>
                </div>
            );
        }

        return (
            <div>
                <label htmlFor="service-instructions" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Special Instructions</label>
                <textarea id="service-instructions" name="service-instructions" value={dynamicFields.instructions || ''} onChange={e => setDynamicFields({...dynamicFields, instructions: e.target.value})} rows={4} className="w-full bg-[#111] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors resize-none" placeholder="Any specific details we should know?" />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#111]">
                <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div>
                    <h1 className="font-black uppercase text-sm">{service.name}</h1>
                    <p className="text-[10px] text-gray-500 tracking-widest uppercase">Booking Flow • Step {currentStep} of {totalSteps}</p>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5">
                <div className="h-full bg-[#E62E00] transition-all duration-300" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
            </div>

            <main className="flex-1 max-w-xl mx-auto w-full px-6 py-8">
                {/* Step 1: Select Vehicle */}
                {currentStep === 1 && (
                    <div className="animate-fadeIn">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <Car className="text-[#E62E00]" /> Select Vehicle
                        </h2>
                        {vehicles.length === 0 ? (
                            <div className="p-6 border border-white/10 bg-[#111] text-center">
                                <p className="text-gray-400 text-sm mb-4">No vehicles found in your garage.</p>
                                <button onClick={() => navigate('/customer-portal/my-garage')} className="text-[#E62E00] font-bold text-xs uppercase tracking-widest border border-[#E62E00] px-4 py-2 hover:bg-[#E62E00] hover:text-white transition-colors">Add Vehicle</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vehicles.map(v => (
                                    <div 
                                        key={v.id || v.plateNumber}
                                        onClick={() => setSelectedVehicle(v.id || v.plateNumber)}
                                        className={`p-4 border cursor-pointer transition-all ${selectedVehicle === (v.id || v.plateNumber) ? 'border-[#E62E00] bg-[#E62E00]/5' : 'border-white/10 bg-[#111] hover:border-white/30'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-black text-white">{v.year} {v.make} {v.model}</h3>
                                                <p className="text-xs text-gray-500 font-mono mt-1">{v.plateNumber}</p>
                                            </div>
                                            {selectedVehicle === (v.id || v.plateNumber) && <CheckCircle size={20} className="text-[#E62E00]" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Schedule */}
                {currentStep === 2 && (
                    <div className="animate-fadeIn">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <Calendar className="text-[#E62E00]" /> Schedule Request
                        </h2>
                        <div className="bg-[#111] border border-white/10 p-6">
                            <label htmlFor="service-schedule-date" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Select Date</label>
                            <input 
                                id="service-schedule-date"
                                name="service-schedule-date"
                                type="date" 
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:outline-none focus:border-[#E62E00] transition-colors"
                            />
                            <p className="text-[10px] text-gray-500 mt-3">
                                Actual time will be coordinated with the service provider after confirmation.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Specific Details */}
                {currentStep === 3 && (
                    <div className="animate-fadeIn">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <FileText className="text-[#E62E00]" /> Service Details
                        </h2>
                        <div className="bg-[#111] border border-white/10 p-6">
                            {renderDynamicFields()}
                        </div>
                    </div>
                )}

                {/* Step 4: Confirm */}
                {currentStep === 4 && (
                    <div className="animate-fadeIn">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                            <CheckCircle className="text-[#E62E00]" /> Review Request
                        </h2>
                        <div className="bg-[#111] border border-white/10 p-6 space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Service</p>
                                <p className="text-sm font-black">{service.name}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-sm font-black">{scheduledDate || 'Not set'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Vehicle</p>
                                    <p className="text-sm font-black">{vehicles.find(v => (v.id || v.plateNumber) === selectedVehicle)?.plateNumber || 'None'}</p>
                                </div>
                            </div>

                            {/* Price & Deposit Breakdown (Especially for Towing) */}
                            {isTowing && (
                                <div className="border-t border-white/10 pt-4 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Standard Towing Base Fee</span>
                                        <span className="font-bold text-white">₱{totalPrice.toLocaleString()}</span>
                                    </div>

                                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
                                        <div className="flex justify-between text-xs text-gray-300">
                                            <span className="flex items-center gap-1.5 font-bold">
                                                <CreditCard size={14} className="text-[#E62E00]" />
                                                Online Deposit Required (50%)
                                            </span>
                                            <span className="font-black text-amber-400">₱{downpaymentAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Remaining Balance on Tow Completion</span>
                                            <span className="font-bold text-gray-300">₱{downpaymentAmount.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-normal pt-1 border-t border-white/5">
                                            * Pay 50% online deposit now via HitPay to dispatch our towing vehicle immediately.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-white/10 pt-6">
                                <label htmlFor="service-notes" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Additional Notes</label>
                                <textarea 
                                    id="service-notes"
                                    name="service-notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3} 
                                    className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 mt-2 focus:outline-none focus:border-[#E62E00]" 
                                    placeholder="Optional notes for the admin..." 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 w-full bg-[#111] border-t border-white/5 p-4 z-50">
                <div className="max-w-xl mx-auto flex gap-4">
                    {currentStep < totalSteps ? (
                        <button 
                            onClick={handleNext}
                            disabled={(currentStep === 1 && !selectedVehicle) || (currentStep === 2 && !scheduledDate)}
                            className="flex-1 bg-[#E62E00] hover:bg-[#ff3300] disabled:bg-white/5 disabled:text-white/30 text-white font-black uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors"
                        >
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 bg-[#E62E00] hover:bg-[#ff3300] disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                            {submitting ? <Spinner size="sm" /> : (isTowing ? `Pay Deposit (₱${downpaymentAmount.toLocaleString()}) & Book` : 'Confirm Booking')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceBookingFlow;
