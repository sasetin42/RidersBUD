import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { useDatabase } from '../context/DatabaseContext';
import { 
    UserCheck, Star, ShieldCheck, Clock, MapPin, Award, 
    CheckCircle2, ChevronDown, Phone, Briefcase, User, Sparkles, Filter
} from 'lucide-react';
import Spinner from '../components/Spinner';
import { HireDriver } from '../types';

const DriverCard: React.FC<{
    driver: HireDriver;
    onSelect: (driver: HireDriver) => void;
    accentColor: string;
}> = ({ driver, onSelect, accentColor }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const specializations = useMemo(() => {
        if (driver.specializations && driver.specializations.length > 0) {
            return driver.specializations;
        }
        return ['Automatic & Manual', 'Defensive Driving', 'VIP & Executive Commute', 'City & Highway Navigation'];
    }, [driver.specializations]);

    const languages = useMemo(() => {
        if (driver.languages && driver.languages.length > 0) {
            return driver.languages;
        }
        return ['Filipino', 'English'];
    }, [driver.languages]);

    return (
        <div className="bg-[#141417] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-xl animate-fadeIn">
            {/* Top Main Driver Section */}
            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Mobile Top Row: Avatar + Name + Status */}
                <div className="flex items-center gap-3 sm:hidden">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#0C0C0E] border border-white/10 relative shrink-0">
                        <img 
                            src={driver.imageUrl || '/placeholder.svg'} 
                            alt={driver.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200';
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <h3 className="text-base font-black text-white truncate">{driver.name}</h3>
                            {driver.isAvailable ? (
                                <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Available
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold bg-gray-600/30 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                                    On Trip
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-light-gray/70 mt-0.5 truncate">{driver.experience} · {driver.licenseType}</p>
                    </div>
                </div>

                {/* Desktop Avatar */}
                <div className="hidden sm:block w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#0C0C0E] border-2 border-white/10 relative shrink-0">
                    <img 
                        src={driver.imageUrl || '/placeholder.svg'} 
                        alt={driver.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200';
                        }}
                    />
                </div>

                {/* Driver Summary Info */}
                <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                        {/* Desktop Name & Status Row */}
                        <div className="hidden sm:flex items-start justify-between gap-2 mb-1">
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight">{driver.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-light-gray/80 font-medium flex items-center gap-1">
                                        <Award size={12} className="text-primary" />
                                        {driver.experience} Experience
                                    </span>
                                    <span className="text-white/20">•</span>
                                    <span className="text-[11px] text-light-gray/80 font-medium">
                                        {driver.licenseType} License
                                    </span>
                                </div>
                            </div>

                            {driver.isAvailable ? (
                                <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-emerald-950">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Available Now
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold bg-gray-600/20 text-gray-400 px-2.5 py-0.5 rounded-full">
                                    Currently Assigned
                                </span>
                            )}
                        </div>

                        {/* Rating, Trips & Coverage */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 mt-1">
                            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                <Star size={11} className="fill-amber-400" />
                                <span>{(driver.rating || 4.9).toFixed(1)}</span>
                                <span className="text-light-gray/60 font-normal">({driver.totalTrips || 120}+ trips)</span>
                            </div>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <MapPin size={11} className="text-primary" />
                                {driver.geoLimit}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                🗣️ {languages.slice(0, 2).join(', ')}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Rates & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 sm:pt-2.5 border-t border-white/5 mt-auto">
                        <div className="min-w-0">
                            <span className="text-[9px] text-light-gray/60 uppercase font-bold tracking-wider block">Standard Rate</span>
                            <p className="text-base sm:text-lg font-black leading-none whitespace-nowrap" style={{ color: accentColor }}>
                                ₱{driver.pricePerHour.toLocaleString()}
                                <span className="text-[10px] font-normal text-light-gray/70 ml-1">/ hr</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(prev => !prev)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all duration-200 whitespace-nowrap shrink-0 ${
                                    isExpanded 
                                        ? 'bg-white/10 border-white/20 text-white' 
                                        : 'bg-white/5 border-white/5 text-light-gray hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="whitespace-nowrap">{isExpanded ? 'Hide' : 'Details'}</span>
                                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={13} />
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelect(driver)}
                                disabled={!driver.isAvailable}
                                style={driver.isAvailable ? { backgroundColor: accentColor } : undefined}
                                className="px-3.5 sm:px-4 py-1.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:scale-100 whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                            >
                                Select Driver
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Driver Details Drawer */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out border-t bg-[#0C0C0E] ${
                    isExpanded ? 'max-h-[500px] opacity-100 border-white/10 p-4' : 'max-h-0 opacity-0 border-transparent p-0'
                }`}
            >
                <div className="space-y-3.5">
                    {/* Bio */}
                    {driver.description && (
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-1">
                                // Driver Background & Bio
                            </span>
                            <p className="text-xs text-light-gray/90 leading-relaxed font-medium">
                                {driver.description}
                            </p>
                        </div>
                    )}

                    {/* Driving Specializations & Transmissions */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-2">
                            // Driving Skills & Specializations
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {specializations.map((spec, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-light-gray/90">
                                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                    <span className="truncate font-medium">{spec}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Credentials & Safety Verification */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                            <span className="text-light-gray/80 font-medium">NBI Cleared & Verified Professional</span>
                        </div>
                        {driver.licenseNumber && (
                            <span className="text-[10px] font-mono text-light-gray/50">
                                License: {driver.licenseNumber}
                            </span>
                        )}
                    </div>

                    {/* Direct Booking CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                        <span className="text-[11px] text-light-gray/60 leading-tight max-w-[200px] sm:max-w-none">
                            Guaranteed replacement driver in case of emergencies
                        </span>
                        <button
                            type="button"
                            onClick={() => onSelect(driver)}
                            disabled={!driver.isAvailable}
                            style={driver.isAvailable ? { backgroundColor: accentColor } : undefined}
                            className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-40 whitespace-nowrap shrink-0 inline-flex items-center justify-center ml-auto sm:ml-0"
                        >
                            Book with {driver.name.split(' ')[0]}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HireDriverScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'drivers' | 'packages'>('drivers');
    const [filterCoverage, setFilterCoverage] = useState<string>('All');
    
    const accentColor = db?.settings?.accentColor || '#FE7803';

    const drivers = useMemo(() => {
        if (!db?.hireDrivers) return [];
        let list = [...db.hireDrivers];
        if (filterCoverage !== 'All') {
            list = list.filter(d => d.geoLimit.toLowerCase().includes(filterCoverage.toLowerCase()));
        }
        return list;
    }, [db?.hireDrivers, filterCoverage]);

    const handleSelectDriver = (driver: HireDriver) => {
        navigate(`/customer-portal/app-services/driver-book/driver-for-hire?driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}`);
    };

    const handleGeneralBookNow = () => {
        navigate('/customer-portal/app-services/driver-book/driver-for-hire');
    };

    if (loading || !db) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <CustomerHeader title="Hire a Driver" showBackButton icon={<UserCheck size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <CustomerHeader title="Hire a Driver" showBackButton icon={<UserCheck size={22} />} />

            {/* Navigation Tabs */}
            <div className="bg-[#0F172A] px-4 py-2.5 border-b border-white/5 flex gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('drivers')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'drivers' 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'bg-white/5 text-light-gray hover:text-white hover:bg-white/10'
                    }`}
                    style={activeTab === 'drivers' ? { backgroundColor: accentColor } : undefined}
                >
                    <User size={13} />
                    <span>Select Driver ({drivers.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('packages')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'packages' 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'bg-white/5 text-light-gray hover:text-white hover:bg-white/10'
                    }`}
                    style={activeTab === 'packages' ? { backgroundColor: accentColor } : undefined}
                >
                    <Briefcase size={13} />
                    <span>Rates & Packages</span>
                </button>
            </div>

            {activeTab === 'drivers' ? (
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
                    {/* Filter Bar */}
                    <div className="flex items-center justify-between gap-2 pb-1">
                        <span className="text-xs text-light-gray/70 font-semibold flex items-center gap-1.5">
                            <Filter size={12} className="text-primary" />
                            Coverage Area:
                        </span>
                        <div className="flex gap-1.5">
                            {['All', 'City', 'Province'].map((cov) => (
                                <button
                                    key={cov}
                                    type="button"
                                    onClick={() => setFilterCoverage(cov)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        filterCoverage === cov 
                                            ? 'bg-white/20 text-white border border-white/20' 
                                            : 'bg-white/5 text-light-gray/70 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {cov}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Driver Cards List */}
                    {drivers.length > 0 ? (
                        drivers.map(driver => (
                            <DriverCard 
                                key={driver.id} 
                                driver={driver} 
                                onSelect={handleSelectDriver} 
                                accentColor={accentColor} 
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <UserCheck size={44} className="text-light-gray/20 mb-3" />
                            <p className="text-sm font-bold text-white">No drivers found in this area</p>
                            <p className="text-xs text-light-gray/60 mt-1">Try switching the coverage filter above.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Service Packages & Inclusions Tab */
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    <div className="text-center py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1" style={{ color: accentColor }}>
                            Transparent Pricing
                        </span>
                        <h2 className="text-xl font-black text-white tracking-tight">Flexible Driving Packages</h2>
                        <p className="text-xs text-light-gray/70 mt-0.5">Select a fixed package tailored for errands, work shifts, or provincial travel.</p>
                    </div>

                    {/* Interactive Package Cards */}
                    <div className="space-y-3.5">
                        {/* Package 1: Hourly */}
                        <div className="bg-[#141416] rounded-2xl border border-white/5 hover:border-white/15 transition-all overflow-hidden shadow-lg">
                            <div className="p-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0 mt-0.5" style={{ color: accentColor }}>
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-base">Hourly Errands & Meetings</h3>
                                            <span className="text-[9px] font-bold bg-white/5 text-light-gray/70 px-2 py-0.5 rounded-full border border-white/5">Min 2 Hrs</span>
                                        </div>
                                        <p className="text-xs text-light-gray/80 mt-1 leading-relaxed">
                                            Ideal for quick city meetings, medical appointments, or errands with multiple stops.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-primary font-black text-lg sm:text-xl block leading-tight" style={{ color: accentColor }}>₱800</span>
                                    <span className="text-[10px] text-light-gray/60 font-semibold">/ hour</span>
                                </div>
                            </div>

                            <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ City Navigation</span>
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ Multiple Stops</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/customer-portal/app-services/driver-book/driver-for-hire')}
                                    style={{ backgroundColor: accentColor }}
                                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                                >
                                    Book Hourly
                                </button>
                            </div>
                        </div>

                        {/* Package 2: Full Day Shift */}
                        <div className="bg-[#141416] rounded-2xl border border-white/5 hover:border-white/15 transition-all overflow-hidden shadow-lg">
                            <div className="p-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0 mt-0.5" style={{ color: accentColor }}>
                                        <Briefcase size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-base">Full Day Shift (8 Hours)</h3>
                                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Most Popular</span>
                                        </div>
                                        <p className="text-xs text-light-gray/80 mt-1 leading-relaxed">
                                            Dedicated professional driver on standby all day for family trips, executive visits, or whole day itineraries.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-primary font-black text-lg sm:text-xl block leading-tight" style={{ color: accentColor }}>₱4,500</span>
                                    <span className="text-[10px] text-light-gray/60 font-semibold">/ 8-hr shift</span>
                                </div>
                            </div>

                            <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ Standby Driver</span>
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ Inter-City Allowed</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/customer-portal/app-services/driver-book/driver-for-hire')}
                                    style={{ backgroundColor: accentColor }}
                                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                                >
                                    Book 8-Hr Shift
                                </button>
                            </div>
                        </div>

                        {/* Package 3: Airport VIP */}
                        <div className="bg-[#141416] rounded-2xl border border-white/5 hover:border-white/15 transition-all overflow-hidden shadow-lg">
                            <div className="p-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0 mt-0.5" style={{ color: accentColor }}>
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-base">Airport VIP Transfer</h3>
                                            <span className="text-[9px] font-bold bg-white/5 text-light-gray/70 px-2 py-0.5 rounded-full border border-white/5">Fixed Rate</span>
                                        </div>
                                        <p className="text-xs text-light-gray/80 mt-1 leading-relaxed">
                                            Direct airport pickup and drop-off. Zero surge pricing with flight tracking and luggage handling.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-primary font-black text-lg sm:text-xl block leading-tight" style={{ color: accentColor }}>₱2,500</span>
                                    <span className="text-[10px] text-light-gray/60 font-semibold">flat rate</span>
                                </div>
                            </div>

                            <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ Luggage Help</span>
                                    <span className="text-[10px] bg-white/5 text-light-gray/80 px-2 py-0.5 rounded-md font-medium">✓ Flight Tracking</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/customer-portal/app-services/driver-book/driver-for-hire')}
                                    style={{ backgroundColor: accentColor }}
                                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                                >
                                    Book Transfer
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Why Choose Us - Responsive Row Cards */}
                    <div className="pt-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-light-gray/50 mb-3">// Our Safety Guarantee</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="flex items-center gap-3 bg-[#111113] p-3.5 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">Vetted & Professional</h4>
                                    <p className="text-[11px] text-light-gray/70">100% background checked with clean NBI clearance.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-[#111113] p-3.5 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-primary shrink-0" style={{ color: accentColor }}>
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">Punctual & Reliable</h4>
                                    <p className="text-[11px] text-light-gray/70">Guaranteed arrival 15 minutes before scheduled pickup.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Sticky Action Bar */}
            <div className="p-3.5 sm:p-4 bg-[#101014]/95 backdrop-blur-xl border-t border-white/10 shrink-0 shadow-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-primary" style={{ color: accentColor }}>
                            <Sparkles size={10} />
                            Driver on Demand
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-white font-bold tracking-tight truncate">Book without selecting a driver</p>
                </div>
                <button 
                    onClick={handleGeneralBookNow} 
                    style={{ backgroundColor: accentColor }}
                    className="px-4 sm:px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25 whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                    <span>Auto-Assign</span>
                    <span className="hidden sm:inline">Driver</span>
                </button>
            </div>
        </div>
    );
};

export default HireDriverScreen;
