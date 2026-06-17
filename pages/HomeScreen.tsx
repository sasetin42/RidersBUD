
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketingBanner from '../components/MarketingBanner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Car, Calendar, FileText, Heart, ChevronRight, Wrench, Search, Bell, Settings, LogOut, User, Phone, MessageSquare, MapPin, Star, Package } from 'lucide-react';
import Spinner from '../components/Spinner';
import NotificationBell from '../components/NotificationBell';
import { MOCKUPS, getProfileImage } from '../utils/imageConstants';
import { getFallbackImageForCategory } from '../utils/fallbackImages';
import Tooltip from '../components/ui/Tooltip';

const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const { db, loading, cancelBooking } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        services: any[];
        products: any[];
        tools: any[];
    }>({ services: [], products: [], tools: [] });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancelBooking = async (bookingId: string) => {
        setIsCancelling(true);
        try {
            await cancelBooking(bookingId, 'Cancelled by customer');
            setBookingToCancel(null);
        } catch (error) {
            console.error('Failed to cancel booking:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim() || !db) {
            setSearchResults({ services: [], products: [], tools: [] });
            setShowSearchDropdown(false);
            return;
        }

        const query = searchQuery.toLowerCase().trim();

        // 1. Filter Services
        const matchedServices = db.services.filter(s => 
            s.name.toLowerCase().includes(query) || 
            (s.description && s.description.toLowerCase().includes(query)) ||
            (s.category && s.category.toLowerCase().includes(query))
        ).slice(0, 5);

        // 2. Filter Parts/Products & Tools
        const matchedParts = db.parts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            p.category.toLowerCase().includes(query)
        );

        // Classify parts into Products vs Tools
        const matchedTools = matchedParts.filter(p => 
            p.category.toLowerCase().includes('tool') || 
            p.category.toLowerCase().includes('equipment') ||
            p.name.toLowerCase().includes('tool') ||
            p.name.toLowerCase().includes('wrench') ||
            p.name.toLowerCase().includes('driver') ||
            p.name.toLowerCase().includes('pliers') ||
            p.name.toLowerCase().includes('kit')
        ).slice(0, 5);

        const matchedProducts = matchedParts.filter(p => 
            !matchedTools.some(t => t.id === p.id)
        ).slice(0, 5);

        setSearchResults({
            services: matchedServices,
            products: matchedProducts,
            tools: matchedTools
        });
        setShowSearchDropdown(true);
    }, [searchQuery, db]);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/customer-portal/services?q=${encodeURIComponent(searchQuery)}`);
            setShowSearchDropdown(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Derived state for widgets
    const activeBooking = db?.bookings.find(b =>
        b.customerName === user?.name &&
        ['En Route', 'In Progress', 'Mechanic Assigned'].includes(b.status)
    );

    const upcomingBookings = React.useMemo(() => {
        if (!db?.bookings || !user) return [];
        return db.bookings
            .filter(b => (b.customerId === user.id || b.customerName === user.name) && ['Upcoming', 'Booking Confirmed'].includes(b.status))
            .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());
    }, [db?.bookings, user]);

    // Live mechanic data lookup
    const liveMechanic = activeBooking && db?.mechanics
        ? db.mechanics.find(m => m.id === activeBooking.mechanicId || m.id === activeBooking.mechanic?.id)
        : activeBooking?.mechanic;

    // Progress bar percent
    const progressPercent = activeBooking 
        ? activeBooking.status === 'Mechanic Assigned' ? '33%'
        : activeBooking.status === 'En Route' ? '66%'
        : '90%'
        : '0%';

    // Status title/subtitle descriptive texts
    const statusText = activeBooking
        ? activeBooking.status === 'Mechanic Assigned' ? 'Mechanic Assigned'
        : activeBooking.status === 'En Route' ? 'Mechanic En Route'
        : 'Service In Progress'
        : '';

    const statusDesc = activeBooking
        ? activeBooking.status === 'Mechanic Assigned' ? 'Preparing tools & heading your way'
        : activeBooking.status === 'En Route' ? `Arriving in ${activeBooking.eta || '15 mins'}`
        : 'Active service under maintenance'
        : '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#121212]">
                <Spinner size="lg" />
            </div>
        );
    }



    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white pb-24 font-sans">
            {/* Header Section */}
            <header className="px-6 py-8 z-30 bg-[#121212]/90 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-sm text-gray-400 font-medium mb-1">Welcome back,</p>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            {user?.name.split(' ')[0]}! <span className="text-2xl">👋</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell Component */}
                        <Tooltip content="Notifications">
                            <NotificationBell className="w-12 h-12 flex items-center justify-center bg-[#1E1E1E] border border-white/10 rounded-full hover:bg-white/10 text-gray-300 hover:text-white" />
                        </Tooltip>

                        {/* Profile Dropdown */}
                        <div className="relative flex items-center justify-center">
                            <Tooltip content="Profile">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="w-12 h-12 rounded-full border border-white/10 overflow-hidden shadow-2xl focus:outline-none transition-all flex items-center justify-center bg-[#1E1E1E] hover:bg-white/10"
                                >
                                    <img
                                        src={getProfileImage(user?.picture, user?.name)}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                </button>
                            </Tooltip>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                                    <div className="py-1">
                                        <Tooltip content="Profile settings" className="w-full">
                                            <button
                                                onClick={() => {
                                                    navigate('/customer-portal/profile');
                                                    setIsProfileOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                                            >
                                                <Settings size={16} />
                                                Profile Settings
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Log out" className="w-full">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-white/5"
                                            >
                                                <LogOut size={16} />
                                                Log Out
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Bar & Live Dropdown - Fully Functional 1-row width */}
                <div className="relative w-full z-40">
                    <div className="relative flex items-center group w-full">
                        <Search className="absolute left-5 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            onFocus={() => setShowSearchDropdown(true)}
                            placeholder="Search services, products, and tools..."
                            className="w-full bg-[#1E1E1E] border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-sm text-white placeholder-gray-500 shadow-inner focus:outline-none focus:border-primary/50 transition-all"
                        />
                    </div>

                    {/* Live Search Overlay Backdrop */}
                    {showSearchDropdown && (searchQuery.trim().length > 0) && (
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowSearchDropdown(false)} />
                    )}

                    {/* Live Search Results Dropdown */}
                    {showSearchDropdown && searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E1E1E]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] z-50 overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-white/5 backdrop-blur-xl">
                            {/* Services */}
                            {searchResults.services.length > 0 && (
                                <div className="p-3">
                                    <h4 className="text-[10px] font-black text-primary tracking-widest uppercase mb-2 px-3">Services</h4>
                                    <div className="space-y-1">
                                        {searchResults.services.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/services?q=${encodeURIComponent(s.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                                        <Wrench size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">{s.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{s.description || 'Professional mechanical service'}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={12} className="text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 transition" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Products */}
                            {searchResults.products.length > 0 && (
                                <div className="p-3">
                                    <h4 className="text-[10px] font-black text-cyan-400 tracking-widest uppercase mb-2 px-3">Products & Parts</h4>
                                    <div className="space-y-1">
                                        {searchResults.products.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/parts-store?q=${encodeURIComponent(p.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                                                        {p.imageUrls?.[0] ? (
                                                            <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Car size={14} className="text-cyan-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{p.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{p.brand || 'Premium replacement part'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-cyan-400">₱{p.price.toLocaleString()}</span>
                                                    <ChevronRight size={12} className="text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tools */}
                            {searchResults.tools.length > 0 && (
                                <div className="p-3">
                                    <h4 className="text-[10px] font-black text-emerald-400 tracking-widest uppercase mb-2 px-3">Tools & Equipment</h4>
                                    <div className="space-y-1">
                                        {searchResults.tools.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/parts-store?q=${encodeURIComponent(t.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                                                        {t.imageUrls?.[0] ? (
                                                            <img src={t.imageUrls[0]} alt={t.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Settings size={14} className="text-emerald-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{t.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{t.brand || 'Workshop tools'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-emerald-400">₱{t.price.toLocaleString()}</span>
                                                    <ChevronRight size={12} className="text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Results */}
                            {searchResults.services.length === 0 && searchResults.products.length === 0 && searchResults.tools.length === 0 && (
                                <div className="p-6 text-center">
                                    <Search size={24} className="text-gray-600 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-gray-400">No matching services, products, or tools found</p>
                                    <p className="text-[10px] text-gray-600 mt-1">Try another keyword</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-grow w-full px-6 space-y-4 overflow-y-auto custom-scrollbar pt-2 max-w-5xl mx-auto">

                {/* Customer Account & Vehicle Banner */}
                {user?.vehicles && user.vehicles.length > 0 && (() => {
                    const primaryVehicle = user.vehicles.find(v => v.isPrimary) || user.vehicles[0];
                    return (
                        <div className="relative bg-gradient-to-br from-primary/20 via-[#1E1E1E] to-[#1E1E1E] rounded-3xl overflow-hidden border border-primary/20 animate-slideUp w-full">
                            {/* Background Overlay Image */}
                            <img
                                src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80"
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000"
                            />
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10 p-6 w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-primary tracking-widest uppercase mb-1">Your Primary Vehicle</p>
                                        <h2 className="text-lg font-black text-white leading-tight">
                                            {primaryVehicle.year} {primaryVehicle.make}
                                        </h2>
                                        <p className="text-sm font-bold text-gray-400">{primaryVehicle.model}</p>
                                        
                                        {/* Dynamic Status / Details */}
                                        <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                            VEHICLE ACTIVE & READY
                                        </div>
                                    </div>
                                    <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
                                        {primaryVehicle.imageUrls && primaryVehicle.imageUrls.length > 0 ? (
                                            <img src={primaryVehicle.imageUrls[0]} alt={`${primaryVehicle.make} ${primaryVehicle.model}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src="/assets/car_mockup.png" alt="Car Mockup" className="w-full h-full object-cover opacity-50" />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-white/10 min-w-0">
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold mb-1 truncate">Plate No.</p>
                                        <p className="text-xs sm:text-sm font-black text-white truncate">{primaryVehicle.plateNumber}</p>
                                    </div>
                                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-white/10 min-w-0">
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold mb-1 truncate">Color</p>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {primaryVehicle.color && (
                                                <div className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: primaryVehicle.color.toLowerCase() }}></div>
                                            )}
                                            <p className="text-xs sm:text-sm font-black text-white truncate">{primaryVehicle.color || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-white/10 min-w-0">
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold mb-1 truncate">Type</p>
                                        <p className="text-xs sm:text-sm font-black text-white truncate">{primaryVehicle.type || 'Sedan'}</p>
                                    </div>
                                </div>

                                <Tooltip content="Manage your vehicles" className="w-full">
                                    <button
                                        onClick={() => navigate('/customer-portal/my-garage')}
                                        className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Car size={18} />
                                        <span>Manage My Garage</span>
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })()}

                {/* Redesigned Upcoming Service Section (Steady/Always Display) */}
                {(() => {
                    if (upcomingBookings.length > 0) {
                        return (
                            <div className="space-y-4 w-full">
                                {upcomingBookings.map((booking) => {
                                    const serviceImg = booking.services?.[0]?.imageUrl || booking.service?.imageUrl || getFallbackImageForCategory(booking.services?.[0]?.category || booking.service?.category || '');
                                    const total = booking.totalAmount || booking.services?.[0]?.price || booking.service?.price || 0;
                                    const deposit = Math.ceil(total * 0.5);
                                    return (
                                        <div 
                                            key={booking.id}
                                            className="bg-gradient-to-br from-[#1E1E1E] to-[#121212] border border-white/5 rounded-3xl p-5 relative overflow-hidden group shadow-lg w-full animate-slideUp"
                                        >
                                            {/* Accent glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                            
                                            <div className="flex gap-4 relative z-10">
                                                {/* Service Image */}
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-[#1A1A1A]">
                                                    <img 
                                                        src={serviceImg || MOCKUPS.changeOil} 
                                                        alt="Service" 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = MOCKUPS.changeOil;
                                                        }}
                                                    />
                                                    <span className="absolute top-2 left-2 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase border border-yellow-400/20">
                                                        Upcoming
                                                    </span>
                                                </div>

                                                {/* Service Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-white font-bold text-base leading-tight truncate">
                                                            {booking.services?.map((s: any) => s.name).join(', ') || booking.service?.name || 'Vehicle Service'}
                                                        </h3>
                                                        <span className="text-xs font-mono text-gray-500">#{booking.id.slice(-6).toUpperCase()}</span>
                                                    </div>

                                                    <p className="text-xs text-yellow-400 font-bold mt-1.5 flex items-center gap-1.5">
                                                        <Calendar size={13} />
                                                        {booking.date} · {booking.time}
                                                    </p>

                                                    <p className="text-xs text-gray-400 mt-2 font-medium">
                                                        Vehicle: <span className="text-gray-300 font-bold">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</span> · <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-300">{booking.vehicle?.plateNumber}</span>
                                                    </p>

                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                        <div className="text-[11px] text-gray-500">
                                                            Payment: <span className={booking.isVerified ? 'text-green-400 font-bold' : 'text-yellow-500 font-bold'}>
                                                                {booking.isVerified ? `Deposit ₱${deposit.toLocaleString()} Verified` : 'Pending Verification'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/customer-portal/booking-detail/${booking.id}`)}
                                                                className="text-xs font-bold text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
                                                            >
                                                                Details
                                                            </button>
                                                            <button
                                                                onClick={() => setBookingToCancel(booking.id)}
                                                                className="text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors bg-red-500/5 px-3 py-1.5 rounded-xl border border-red-500/20"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Steady State (display when there are no upcoming bookings and no active/ongoing booking)
                    if (!activeBooking) {
                        return (
                            <div className="bg-[#1E1E1E] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-lg w-full flex flex-col items-center text-center animate-slideUp">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <Calendar size={22} className="text-gray-400" />
                                </div>
                                <h3 className="text-white font-bold text-sm">No Upcoming Services</h3>
                                <p className="text-xs text-gray-400 max-w-xs mt-1.5 mb-4 leading-relaxed">
                                    Keep your ride in top shape! Book a professional maintenance or checkup service today.
                                </p>
                                <button
                                    onClick={() => navigate('/customer-portal/services')}
                                    className="bg-primary hover:bg-primary/95 text-black font-black text-xs px-5 py-2.5 rounded-2xl transition border border-primary/20 flex items-center gap-1.5 shadow-md shadow-primary/5 hover:scale-[1.02] active:scale-95 animate-pulse"
                                >
                                    <Wrench size={14} />
                                    Book a Service Now
                                </button>
                            </div>
                        );
                    }

                    return null;
                })()}

                {/* Current Booking Widget - Moved Here */}
                {activeBooking && (
                    <div className="animate-slideUp w-full">
                        <div
                            onClick={() => navigate(`/customer-portal/booking-detail/${activeBooking.id}`)}
                            className="bg-gradient-to-br from-[#25160D] via-[#1E1E1E] to-[#121212] border border-primary/20 rounded-3xl p-5 relative overflow-hidden group cursor-pointer shadow-xl hover:shadow-primary/5 transition-all w-full"
                        >
                            {/* Blur accent */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-[#2A1C15] border border-white/5 flex items-center justify-center shadow-inner">
                                        <Wrench className="text-primary h-6 w-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-base leading-tight group-hover:text-primary transition-colors">{activeBooking.serviceName}</h3>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">{activeBooking.vehicle.make} {activeBooking.vehicle.model} • <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-300">{activeBooking.vehicle.plateNumber}</span></p>
                                    </div>
                                </div>
                                <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-1.5 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                                    {activeBooking.status}
                                </span>
                            </div>

                            {/* Progress & Status Description */}
                            <div className="space-y-3 relative z-10 border-b border-white/5 pb-4 mb-4">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-gray-300 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {statusText}
                                    </span>
                                    <span className="text-primary font-bold">{statusDesc}</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full animate-pulse transition-all duration-500" style={{ width: progressPercent }}></div>
                                </div>
                            </div>

                            {/* Live Mechanic Profile Section */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-2xl border border-white/10 bg-[#2A1C15] flex items-center justify-center font-bold text-white overflow-hidden shadow-md">
                                            {liveMechanic?.imageUrl ? (
                                                <img 
                                                    src={liveMechanic.imageUrl} 
                                                    alt={liveMechanic.name || activeBooking.mechanicName} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center font-black text-sm text-white">
                                                    {(liveMechanic?.name || activeBooking.mechanicName || 'M').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {/* Online indicator */}
                                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#1E1E1E] ${liveMechanic?.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-white font-black">{liveMechanic?.name || activeBooking.mechanicName || 'Assigned Mechanic'}</span>
                                            {liveMechanic?.rating && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded font-bold">
                                                    <Star size={10} className="fill-current" />
                                                    {liveMechanic.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                            {liveMechanic?.specializations && liveMechanic.specializations.length > 0
                                                ? liveMechanic.specializations.slice(0, 2).join(' • ')
                                                : 'Expert Mechanic'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions buttons */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {((activeBooking.paymentMethod === 'gcash' && !activeBooking.gcashReceiptUrl) || activeBooking.gcashPaymentStatus === 'awaiting_payment') && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/customer-portal/booking-detail/${activeBooking.id}`);
                                            }}
                                            className="flex-1 sm:flex-initial py-2.5 px-4 bg-[#FE7803] hover:bg-[#e06902] rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-orange-500/15 animate-pulse"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {activeBooking.gcashPaymentStatus === 'awaiting_payment' ? 'Pay 50% Balance' : 'Pay Downpayment'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/customer-portal/booking-detail/${activeBooking.id}?chat=true`);
                                        }}
                                        className="flex-1 sm:flex-initial py-2.5 px-4 bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-primary/10"
                                    >
                                        <MessageSquare size={14} />
                                        Chat
                                    </button>
                                    {activeBooking.status === 'En Route' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/customer-portal/booking-detail/${activeBooking.id}?track=true`);
                                            }}
                                            className="flex-1 sm:flex-initial py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <MapPin size={14} />
                                            Track
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* Marketing Banner - Random Slider */}
                <MarketingBanner />

                {/* Popular Services */}
                <section className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-end mb-5">
                        <h2 className="text-lg font-black text-white tracking-wide">Popular Services</h2>
                        <Tooltip content="Browse all services">
                            <Link to="/customer-portal/services" className="text-xs text-primary font-bold hover:text-white transition-colors">View All</Link>
                        </Tooltip>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory">
                        {db?.services.slice(0, 5).map(service => (
                            <Tooltip key={service.id} content={service.name}>
                                <Link
                                    to={`/customer-portal/service/${service.id}`}
                                    className="flex-shrink-0 w-44 group relative snap-start"
                                >
                                    <div className="h-56 w-full rounded-2xl overflow-hidden relative shadow-lg bg-[#1E1E1E] group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500">
                                        <img src={service.imageUrl || getFallbackImageForCategory(service.category)} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }} />
                                        {/* Enhanced Gradient Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/90 to-transparent"></div>

                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h3 className="text-lg font-black text-white leading-tight mb-1 group-hover:text-primary transition-colors duration-300">{service.name}</h3>
                                            <p className="text-xs font-bold text-primary group-hover:text-white transition-colors duration-300">From ₱{service.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Genuine Parts Banner — Premium Redesign */}
                <section className="animate-slideUp space-y-4">
                    <div
                        className="w-full relative rounded-3xl overflow-hidden py-6 sm:py-8 min-h-[240px] bg-gradient-to-br from-[#1E1E22] via-[#121214] to-[#0A0A0C] border border-white/5 group cursor-pointer shadow-2xl hover:border-primary/30 hover:shadow-primary/5 transition-all duration-500 flex items-center"
                        onClick={() => navigate('/customer-portal/parts-store')}
                    >
                        {/* Background overlay image — proper dark industrial texture */}
                        <img
                            src={MOCKUPS.GENUINE_PARTS_TEXTURE}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 group-hover:scale-100 group-hover:opacity-30 transition-all duration-1000"
                            loading="eager"
                        />
                        {/* Diagonal accent lines */}
                        <div className="absolute inset-0 opacity-[0.04] z-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px)' }} />
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10" />

                        {/* Content */}
                        <div className="relative z-20 h-full flex flex-col justify-center pl-6 sm:pl-10 pr-2 w-[60%] sm:w-[55%]">
                            {/* Badge */}
                            <span className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black tracking-widest px-3 py-1 rounded-full w-fit mb-3">
                                <Package size={12} /> PARTS & ACCESSORIES
                            </span>

                            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-1.5">Genuine Parts</h3>
                            <p className="text-xs sm:text-sm text-gray-400 font-medium mb-2">Premium quality auto parts & tools. Upgrade your ride today.</p>
                            
                            {/* Parts count */}
                            <p className="text-[11px] text-gray-600 font-bold mb-3">
                                {db?.parts?.length || 0}+ parts available
                            </p>

                            {/* Category Chips */}
                            <div className="flex flex-wrap gap-1.5 mb-3.5">
                                {(() => {
                                    const cats: string[] = [...new Set((db?.parts || []).map((p: any) => p.category).filter(Boolean) as string[])];
                                    return cats.slice(0, 4).map(cat => (
                                        <span
                                            key={cat}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customer-portal/parts-store?category=${encodeURIComponent(cat)}`); }}
                                            className="text-[9px] sm:text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-pointer"
                                        >
                                            {cat}
                                        </span>
                                    ));
                                })()}
                            </div>

                            <span className="text-xs font-bold text-primary transition-all duration-300 flex items-center gap-1.5 group-hover:translate-x-2 w-fit">
                                <span className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center gap-1.5">
                                    Browse All Parts <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                                </span>
                            </span>
                        </div>
                        
                        {/* Floating Part Image — fixed display with screen blend to hide solid background */}
                        <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 z-20">
                            <img
                                src={MOCKUPS.TURBO_PART}
                                alt="Brake Disc"
                                className="h-32 w-32 sm:h-40 sm:w-40 object-contain drop-shadow-[0_12px_35px_rgba(254,120,3,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 ease-out animate-float mix-blend-screen"
                                loading="eager"
                            />
                            {/* Glow ring behind part */}
                            <div className="absolute inset-0 -z-10 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                        </div>

                        {/* Bottom gradient edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 z-20" />
                    </div>

                    {/* Expert Services Banner — Premium Redesign */}
                    <div
                        className="w-full relative rounded-3xl overflow-hidden py-6 sm:py-8 min-h-[240px] bg-gradient-to-br from-orange-950/40 via-[#121214] to-[#0A0A0C] border border-orange-500/20 group cursor-pointer shadow-2xl hover:border-primary/30 hover:shadow-orange-500/10 transition-all duration-500 flex items-center"
                        onClick={() => navigate('/customer-portal/services')}
                    >
                        {/* Sharp Background Image */}
                        <img
                            src={MOCKUPS.PREMIUM_SERVICE_BANNER}
                            alt="Services Garage"
                            className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 group-hover:opacity-45 transition-all duration-1000 ease-out"
                            loading="eager"
                        />
                        {/* Diagonal accent lines */}
                        <div className="absolute inset-0 opacity-[0.04] z-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px)' }} />
                        {/* Dark Gradient Overlay to ensure text readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10"></div>

                        {/* Clean Text Container Overlay */}
                        <div className="relative z-20 h-full flex flex-col justify-center pl-6 sm:pl-10 pr-2 w-[80%] sm:w-[70%]">
                            {/* Badge */}
                            <span className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black tracking-widest px-3 py-1 rounded-full w-fit mb-3 uppercase">
                                <Wrench size={12} /> EXPERT CARE
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-1.5 whitespace-nowrap">
                                Premium Service
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-400 font-medium mb-2 line-clamp-2 leading-relaxed">
                                Book certified mechanics for expert diagnostics, auto repairs, and maintenance.
                            </p>
                            
                            {/* Services count */}
                            <p className="text-[11px] text-gray-600 font-bold mb-3">
                                {db?.services?.length || 0}+ specialized services ready
                            </p>

                            {/* Service Categories Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-3.5 w-full">
                                {(() => {
                                    const cats: string[] = [...new Set((db?.services || []).map((s: any) => s.category).filter(Boolean) as string[])];
                                    return cats.slice(0, 4).map(cat => (
                                        <span
                                            key={cat}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customer-portal/services?category=${encodeURIComponent(cat)}`); }}
                                            className="text-[9px] sm:text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-pointer flex-shrink-0"
                                        >
                                            {cat}
                                        </span>
                                    ));
                                })()}
                            </div>

                            <span className="text-xs font-bold text-primary transition-all duration-300 flex items-center gap-1.5 group-hover:translate-x-2 w-fit">
                                <span className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center gap-1.5">
                                    Book Appointment <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                                </span>
                            </span>
                        </div>

                        {/* Floating visual detail indicator for services */}
                        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none hidden xs:block">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-primary/20 flex items-center justify-center bg-black/40 backdrop-blur-md relative animate-pulse">
                                <Calendar className="w-10 h-10 sm:w-14 sm:h-14 text-primary" />
                                <div className="absolute -inset-1 rounded-full border border-dashed border-primary/40 animate-spin-slow"></div>
                            </div>
                        </div>

                        {/* Bottom gradient edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 z-20" />
                    </div>
                </section>

            </main>

            {/* Cancellation Confirmation Modal */}
            {bookingToCancel && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl max-w-sm w-full p-6 animate-zoomIn relative">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                            <Calendar size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-white font-extrabold text-lg">Cancel Appointment?</h3>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            Are you sure you want to cancel this booking? This will cancel the service schedule and notify the admin immediately.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                disabled={isCancelling}
                                onClick={() => setBookingToCancel(null)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl border border-white/5 transition-all text-xs"
                            >
                                No, Keep It
                            </button>
                            <button
                                disabled={isCancelling}
                                onClick={() => handleCancelBooking(bookingToCancel)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                            >
                                {isCancelling ? <Spinner size="sm" /> : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeScreen;
