import React, { useState } from 'react';
import { 
    Car, Users, FileText, Truck, DollarSign, ShieldAlert, Clock, 
    Percent, CheckCircle2, AlertCircle, Info, Sparkles, SlidersHorizontal, 
    Fuel, Gauge, ShieldCheck, MapPin, PhoneCall, Compass, Check
} from 'lucide-react';
import { 
    Settings, 
    CarRentalServiceSettings, 
    DriverHireServiceSettings, 
    LiaisonServiceSettings, 
    TowingServiceSettings 
} from '../../../../types';

interface ServicesSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    initialService?: 'carRental' | 'driverHire' | 'liaison' | 'towing';
}

export const ServicesSettingsTab: React.FC<ServicesSettingsTabProps> = ({
    settings,
    onChange,
    initialService = 'carRental'
}) => {
    const [selectedService, setSelectedService] = useState<'carRental' | 'driverHire' | 'liaison' | 'towing'>(initialService);

    // Fallback safe objects
    const customizations = settings.serviceCustomizations || {};

    const carRental: CarRentalServiceSettings = customizations.carRental || {
        enabled: true,
        bannerMessage: '',
        securityDepositAmount: 3000,
        driverAddonDailyRate: 800,
        minRentalDays: 1,
        fuelPolicy: 'full_to_full',
        dailyMileageLimitKm: 300,
        insuranceDailyFee: 350,
        lateReturnPenaltyPerHour: 200,
        requireValidLicense: true,
        requireValidId: true,
        cancellationWindowHours: 24,
        termsAndConditions: 'Drivers must possess a valid driver\'s license and government-issued ID. Security deposit is fully refundable upon safe vehicle return with no damages.'
    };

    const driverHire: DriverHireServiceSettings = customizations.driverHire || {
        enabled: true,
        bannerMessage: '',
        twoHoursRate: 1600,
        fourHoursRate: 3200,
        eightHoursRate: 4500,
        airportTransferRate: 5500,
        depositPercentage: 50,
        overtimeRatePerHour: 400,
        customerCarDiscount: 0,
        nightDifferentialRatePerHour: 250,
        advanceBookingNoticeHours: 2,
        allowCustomerCarOnly: false,
        termsAndConditions: 'Driver for Hire services require a 50% deposit upon booking confirmation. Overtime charges apply after the selected hourly package.'
    };

    const liaison: LiaisonServiceSettings = customizations.liaison || {
        enabled: true,
        bannerMessage: '',
        renewalServiceFee: 1500,
        transferOwnershipFee: 2200,
        duplicateDocFee: 1200,
        documentPickupFee: 250,
        rushProcessingFee: 500,
        leadTimeDays: 2,
        requireEmissionTestCopy: true,
        requireInsuranceCopy: true,
        termsAndConditions: 'Liaison officers handle official LTO document processing. Government fees and document clearance are settled prior to submission.'
    };

    const towing: TowingServiceSettings = customizations.towing || {
        enabled: true,
        bannerMessage: '',
        baseHookupFee: 1500,
        perKmRate: 65,
        flatbedSurcharge: 800,
        winchingRecoveryFee: 1200,
        nightDifferentialSurcharge: 500,
        maxDispatchRadiusKm: 50,
        priorityResponseTimeMinutes: 30,
        emergencyHotline: '0917-888-7433',
        termsAndConditions: 'Towing dispatch operates 24/7. Base hookup includes the first 5km; succeeding distance is calculated based on exact GPS coordinates.'
    };

    const updateServiceSubfield = (
        serviceKey: 'carRental' | 'driverHire' | 'liaison' | 'towing',
        fieldKey: string,
        val: any
    ) => {
        const currentServiceObj = customizations[serviceKey] || (
            serviceKey === 'carRental' ? carRental :
            serviceKey === 'driverHire' ? driverHire :
            serviceKey === 'liaison' ? liaison : towing
        );

        const updated = {
            ...customizations,
            [serviceKey]: {
                ...currentServiceObj,
                [fieldKey]: val
            }
        };

        onChange('serviceCustomizations', updated);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header / Description Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-orange-950/20 to-transparent p-6 rounded-3xl border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-primary/20 text-primary">
                            <SlidersHorizontal size={18} />
                        </span>
                        <h3 className="text-lg font-black text-white tracking-tight">Specialized Services Customization Hub</h3>
                    </div>
                    <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                        Control real-time pricing rules, security deposits, downpayment requirements, operational limitations, and policies specifically for Car Rental, Driver for Hire, Liaison, and Towing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                        Real-Time Sync Active
                    </span>
                </div>
            </div>

            {/* Service Horizontal Switcher Buttons with Distinctive Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { id: 'carRental', name: 'Car Rental', icon: <Car size={16} />, active: carRental.enabled, color: 'text-amber-400' },
                    { id: 'driverHire', name: 'Driver for Hire', icon: <Users size={16} />, active: driverHire.enabled, color: 'text-sky-400' },
                    { id: 'liaison', name: 'Liaison Assistance', icon: <FileText size={16} />, active: liaison.enabled, color: 'text-emerald-400' },
                    { id: 'towing', name: 'Towing Service', icon: <Truck size={16} />, active: towing.enabled, color: 'text-rose-400' },
                ].map((tab) => {
                    const isSelected = selectedService === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedService(tab.id as any)}
                            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-24 ${
                                isSelected
                                    ? 'bg-primary/15 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/40'
                                    : 'bg-[#121212]/70 border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className={`p-2 rounded-xl bg-white/5 ${tab.color}`}>
                                    {tab.icon}
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                    tab.active 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-white/5 text-gray-500 border-white/10'
                                }`}>
                                    {tab.active ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </div>
                            <span className="text-xs font-black text-white tracking-tight">{tab.name}</span>
                        </button>
                    );
                })}
            </div>

            {/* ========================================================================= */}
            {/* 1. CAR RENTAL SERVICE CONFIGURATION */}
            {/* ========================================================================= */}
            {selectedService === 'carRental' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#121212]/70 border border-white/5 p-6 rounded-3xl space-y-6">
                        {/* Master Toggle & Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Car size={18} className="text-amber-400" />
                                        <span>Car Rental Operations & Fleet Settings</span>
                                    </h4>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                        carRental.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {carRental.enabled ? 'SERVICE ONLINE' : 'SERVICE PAUSED'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Manage security deposits, mileage restrictions, fuel policies, and driver add-ons.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => updateServiceSubfield('carRental', 'enabled', !carRental.enabled)}
                                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                                    carRental.enabled
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
                                }`}
                            >
                                {carRental.enabled ? 'Enabled in App' : 'Disabled / Hidden'}
                            </button>
                        </div>

                        {/* Banner Message */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Public Announcement / Notice Banner</label>
                            <input
                                type="text"
                                value={carRental.bannerMessage || ''}
                                onChange={(e) => updateServiceSubfield('carRental', 'bannerMessage', e.target.value)}
                                placeholder="e.g. Free delivery within Metro Carmona for rentals over 3 days..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        {/* Rates & Deposits Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Security Deposit (PHP)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={carRental.securityDepositAmount ?? 3000}
                                        onChange={(e) => updateServiceSubfield('carRental', 'securityDepositAmount', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Refunded upon safe inspection return.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Driver Add-on Daily Rate</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={carRental.driverAddonDailyRate ?? 800}
                                        onChange={(e) => updateServiceSubfield('carRental', 'driverAddonDailyRate', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">When client selects "Include Professional Driver".</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Daily Mileage Limit (KM)</label>
                                <input
                                    type="number"
                                    min={50}
                                    value={carRental.dailyMileageLimitKm ?? 300}
                                    onChange={(e) => updateServiceSubfield('carRental', 'dailyMileageLimitKm', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                                <p className="text-[9px] text-gray-500">Standard limit per day before extra km fees.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Late Return Penalty (PHP/Hr)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={carRental.lateReturnPenaltyPerHour ?? 200}
                                        onChange={(e) => updateServiceSubfield('carRental', 'lateReturnPenaltyPerHour', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Charged when car return exceeds scheduled drop-off.</p>
                            </div>
                        </div>

                        {/* Policies & Rules */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Fuel Policy</label>
                                <select
                                    value={carRental.fuelPolicy || 'full_to_full'}
                                    onChange={(e) => updateServiceSubfield('carRental', 'fuelPolicy', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                >
                                    <option value="full_to_full">Full-to-Full (Deliver full, return full)</option>
                                    <option value="same_level">Same Level (Return with original fuel level)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Minimum Rental Duration (Days)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={carRental.minRentalDays ?? 1}
                                    onChange={(e) => updateServiceSubfield('carRental', 'minRentalDays', parseInt(e.target.value) || 1)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Free Cancellation Window (Hours)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={carRental.cancellationWindowHours ?? 24}
                                    onChange={(e) => updateServiceSubfield('carRental', 'cancellationWindowHours', parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>
                        </div>

                        {/* Terms & Verification Toggles */}
                        <div className="space-y-3 pt-2">
                            <div className="flex flex-wrap gap-6 p-4 rounded-2xl bg-black/30 border border-white/5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={carRental.requireValidLicense ?? true}
                                        onChange={(e) => updateServiceSubfield('carRental', 'requireValidLicense', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs font-bold text-gray-300">Mandatory Driver's License Upload</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={carRental.requireValidId ?? true}
                                        onChange={(e) => updateServiceSubfield('carRental', 'requireValidId', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs font-bold text-gray-300">Mandatory Secondary Government ID</span>
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Rental Terms & Agreement Notice</label>
                                <textarea
                                    rows={2}
                                    value={carRental.termsAndConditions || ''}
                                    onChange={(e) => updateServiceSubfield('carRental', 'termsAndConditions', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs text-gray-200 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. DRIVER FOR HIRE SERVICE CONFIGURATION */}
            {/* ========================================================================= */}
            {selectedService === 'driverHire' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#121212]/70 border border-white/5 p-6 rounded-3xl space-y-6">
                        {/* Master Toggle & Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Users size={18} className="text-sky-400" />
                                        <span>Driver for Hire Pricing & Dispatch Rules</span>
                                    </h4>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                        driverHire.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {driverHire.enabled ? 'SERVICE ONLINE' : 'SERVICE PAUSED'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Configure hourly package rates, upfront deposit percentage, overtime fees, and booking lead time.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => updateServiceSubfield('driverHire', 'enabled', !driverHire.enabled)}
                                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                                    driverHire.enabled
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
                                }`}
                            >
                                {driverHire.enabled ? 'Enabled in App' : 'Disabled / Hidden'}
                            </button>
                        </div>

                        {/* Banner Message */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Driver Service Announcement Banner</label>
                            <input
                                type="text"
                                value={driverHire.bannerMessage || ''}
                                onChange={(e) => updateServiceSubfield('driverHire', 'bannerMessage', e.target.value)}
                                placeholder="e.g. Certified executive chauffeurs available for airport transfers and out-of-town trips..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        {/* Standard Package Rates */}
                        <div>
                            <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                                <DollarSign size={14} className="text-primary" />
                                <span>Hourly Package Rates (PHP)</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">2 Hours Minimum Package</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={driverHire.twoHoursRate ?? 1600}
                                            onChange={(e) => updateServiceSubfield('driverHire', 'twoHoursRate', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">4 Hours (Half-Day)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={driverHire.fourHoursRate ?? 3200}
                                            onChange={(e) => updateServiceSubfield('driverHire', 'fourHoursRate', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">8 Hours (Full-Day)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={driverHire.eightHoursRate ?? 4500}
                                            onChange={(e) => updateServiceSubfield('driverHire', 'eightHoursRate', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Airport / Out-of-Town Base</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={driverHire.airportTransferRate ?? 5500}
                                            onChange={(e) => updateServiceSubfield('driverHire', 'airportTransferRate', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deposit & Extra Surcharges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1">
                                    <Percent size={12} className="text-primary" />
                                    <span>Online Downpayment Deposit (%)</span>
                                </label>
                                <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={driverHire.depositPercentage ?? 50}
                                    onChange={(e) => updateServiceSubfield('driverHire', 'depositPercentage', parseFloat(e.target.value) || 50)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                />
                                <p className="text-[9px] text-gray-500">Percentage charged via HitPay on checkout (default 50%).</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Overtime Rate (PHP/Hour)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={driverHire.overtimeRatePerHour ?? 400}
                                        onChange={(e) => updateServiceSubfield('driverHire', 'overtimeRatePerHour', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Charged for duty hours exceeding reserved package.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Advance Booking Notice (Hours)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={driverHire.advanceBookingNoticeHours ?? 2}
                                    onChange={(e) => updateServiceSubfield('driverHire', 'advanceBookingNoticeHours', parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                                <p className="text-[9px] text-gray-500">Minimum lead time required before pickup time.</p>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Driver Terms & Passenger Policy</label>
                            <textarea
                                rows={2}
                                value={driverHire.termsAndConditions || ''}
                                onChange={(e) => updateServiceSubfield('driverHire', 'termsAndConditions', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs text-gray-200 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. LIAISON ASSISTANCE SERVICE CONFIGURATION */}
            {/* ========================================================================= */}
            {selectedService === 'liaison' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#121212]/70 border border-white/5 p-6 rounded-3xl space-y-6">
                        {/* Master Toggle & Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <FileText size={18} className="text-emerald-400" />
                                        <span>Liaison Registration & Document Handling Settings</span>
                                    </h4>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                        liaison.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {liaison.enabled ? 'SERVICE ONLINE' : 'SERVICE PAUSED'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Configure processing fees for LTO registration, ownership transfer, document pickup, and rush service.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => updateServiceSubfield('liaison', 'enabled', !liaison.enabled)}
                                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                                    liaison.enabled
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
                                }`}
                            >
                                {liaison.enabled ? 'Enabled in App' : 'Disabled / Hidden'}
                            </button>
                        </div>

                        {/* Banner Message */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Liaison Service Announcement Banner</label>
                            <input
                                type="text"
                                value={liaison.bannerMessage || ''}
                                onChange={(e) => updateServiceSubfield('liaison', 'bannerMessage', e.target.value)}
                                placeholder="e.g. Fast-track vehicle registration renewal and transfer of ownership with door-to-door document pickup..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        {/* Processing Service Fees */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Registration Renewal Fee</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={liaison.renewalServiceFee ?? 1500}
                                        onChange={(e) => updateServiceSubfield('liaison', 'renewalServiceFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Service assistance charge.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Transfer of Ownership Fee</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={liaison.transferOwnershipFee ?? 2200}
                                        onChange={(e) => updateServiceSubfield('liaison', 'transferOwnershipFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Complete deed & clearance processing.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Home / Office Pickup Surcharge</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={liaison.documentPickupFee ?? 250}
                                        onChange={(e) => updateServiceSubfield('liaison', 'documentPickupFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Couriers collect documents at client pin.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Expedited Rush Processing</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={liaison.rushProcessingFee ?? 500}
                                        onChange={(e) => updateServiceSubfield('liaison', 'rushProcessingFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Same-day queueing priority.</p>
                            </div>
                        </div>

                        {/* Requirements Checklist Toggles */}
                        <div className="space-y-3 pt-2">
                            <div className="flex flex-wrap gap-6 p-4 rounded-2xl bg-black/30 border border-white/5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={liaison.requireEmissionTestCopy ?? true}
                                        onChange={(e) => updateServiceSubfield('liaison', 'requireEmissionTestCopy', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs font-bold text-gray-300">Require Valid Smoke / Emission Certificate</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={liaison.requireInsuranceCopy ?? true}
                                        onChange={(e) => updateServiceSubfield('liaison', 'requireInsuranceCopy', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs font-bold text-gray-300">Require TPL Insurance Copy</span>
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Liaison Policy & Document Instructions</label>
                                <textarea
                                    rows={2}
                                    value={liaison.termsAndConditions || ''}
                                    onChange={(e) => updateServiceSubfield('liaison', 'termsAndConditions', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs text-gray-200 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. TOWING SERVICE CONFIGURATION */}
            {/* ========================================================================= */}
            {selectedService === 'towing' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#121212]/70 border border-white/5 p-6 rounded-3xl space-y-6">
                        {/* Master Toggle & Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Truck size={18} className="text-rose-400" />
                                        <span>24/7 Towing & Roadside Emergency Recovery Settings</span>
                                    </h4>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                        towing.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {towing.enabled ? 'SERVICE ONLINE' : 'SERVICE PAUSED'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Configure base hookup rates, per-kilometer charges, flatbed surcharges, and emergency hotlines.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => updateServiceSubfield('towing', 'enabled', !towing.enabled)}
                                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                                    towing.enabled
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
                                }`}
                            >
                                {towing.enabled ? 'Enabled in App' : 'Disabled / Hidden'}
                            </button>
                        </div>

                        {/* Banner Message */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Towing Service Public Announcement Banner</label>
                            <input
                                type="text"
                                value={towing.bannerMessage || ''}
                                onChange={(e) => updateServiceSubfield('towing', 'bannerMessage', e.target.value)}
                                placeholder="e.g. 24/7 Heavy-Duty flatbeds and wheel-lift wreckers standby across Cavite & Laguna..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        {/* Distance & Hookup Rates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Base Hookup Fee (First 5KM)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={towing.baseHookupFee ?? 1500}
                                        onChange={(e) => updateServiceSubfield('towing', 'baseHookupFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Standard wrecker flagdown.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Distance Rate (PHP / KM)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={towing.perKmRate ?? 65}
                                        onChange={(e) => updateServiceSubfield('towing', 'perKmRate', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">Applies after base 5km radius.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Flatbed Carrier Surcharge</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={towing.flatbedSurcharge ?? 800}
                                        onChange={(e) => updateServiceSubfield('towing', 'flatbedSurcharge', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">For low-clearance & AWD vehicles.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Off-Road / Winching Recovery</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={towing.winchingRecoveryFee ?? 1200}
                                        onChange={(e) => updateServiceSubfield('towing', 'winchingRecoveryFee', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500">For ditch / mud pullouts.</p>
                            </div>
                        </div>

                        {/* Dispatch & Operations */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Max Towing Service Radius (KM)</label>
                                <input
                                    type="number"
                                    min={5}
                                    value={towing.maxDispatchRadiusKm ?? 50}
                                    onChange={(e) => updateServiceSubfield('towing', 'maxDispatchRadiusKm', parseInt(e.target.value) || 50)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Night Differential (10PM - 6AM)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">₱</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={towing.nightDifferentialSurcharge ?? 500}
                                        onChange={(e) => updateServiceSubfield('towing', 'nightDifferentialSurcharge', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Emergency Dispatch Hotline</label>
                                <input
                                    type="text"
                                    value={towing.emergencyHotline || '0917-888-7433'}
                                    onChange={(e) => updateServiceSubfield('towing', 'emergencyHotline', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Towing Terms & Roadside Disclaimer</label>
                            <textarea
                                rows={2}
                                value={towing.termsAndConditions || ''}
                                onChange={(e) => updateServiceSubfield('towing', 'termsAndConditions', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs text-gray-200 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
