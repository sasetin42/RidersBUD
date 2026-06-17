import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import Modal from '../admin/Modal';
import { User, Car, Wrench, Clock, ChevronRight, DollarSign } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';


type CalendarView = 'month' | 'week' | 'day';

interface DayDetailModalProps {
    date: Date;
    bookings: Booking[];
    onClose: () => void;
    isPublic?: boolean;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, bookings, onClose, isPublic }) => {
    const navigate = useNavigate();
    const { db } = useDatabase();

    const handleItemClick = (booking: Booking) => {
        if (isPublic) {
            return; // Not clickable for public view
        }
        navigate(`/mechanic-portal/job/${booking.id}`);
    };

    const statusColors: Record<BookingStatus, string> = {
        Completed: 'bg-green-500/20 text-green-300 border border-green-500/30',
        Upcoming: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        'En Route': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        'In Progress': 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
        Cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
        'Booking Confirmed': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
        'Mechanic Assigned': 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
        'Reschedule Requested': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        'Work Done': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    };

    return (
        <Modal
            title={`Jobs for ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            isOpen={true}
            onClose={onClose}
        >
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {bookings.map(booking => {
                    const price = booking.totalAmount || booking.service?.price || booking.services?.[0]?.price || 0;
                    const vehicleLabel = booking.vehicle
                        ? `${booking.vehicle.year || ''} ${booking.vehicle.make || ''} ${booking.vehicle.model || ''}`.trim()
                        : '';
                    const initials = (booking.customerName || 'C').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const customer = db?.customers?.find(c => c.id === booking.customerId || c.name === booking.customerName);
                    const avatarUrl = customer?.picture || booking.customerAvatar || booking.customerImage;
                    const vehicleImage = booking.vehicle?.image || booking.vehicle?.imageUrl || booking.vehicleImage || booking.imageUrl;

                    return (
                        <button
                            key={booking.id}
                            onClick={() => handleItemClick(booking)}
                            className={`w-full text-left bg-[#1E1E1E] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 transition-all ${!isPublic ? 'cursor-pointer hover:bg-white/[0.06] hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]' : 'cursor-default'}`}
                        >
                            {/* Time and Status Row */}
                            <div className="flex justify-between items-center w-full">
                                <span className="flex items-center gap-1.5 text-primary text-xs font-black tracking-wider uppercase">
                                    <Clock size={12} className="stroke-[2.5]" />
                                    {booking.time}
                                </span>
                                <span className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase ${statusColors[booking.status] || 'bg-gray-500/20 text-gray-300'}`}>
                                    {isPublic
                                        ? (booking.status === 'Completed' || booking.status === 'Cancelled' ? booking.status : 'Booked')
                                        : booking.status
                                    }
                                </span>
                            </div>

                            {/* Client & Service Info */}
                            <div className="flex items-start gap-3 w-full">
                                {!isPublic && (
                                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center relative bg-black/20">
                                        <img
                                            src={avatarUrl || '/riders-logo.png'}
                                            alt={booking.customerName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-white leading-snug truncate">
                                        {booking.service?.name || booking.services?.[0]?.name || 'Service'}
                                    </h4>
                                    {!isPublic && (
                                        <p className="text-xs text-gray-400 font-semibold truncate mt-0.5">
                                            {booking.customerName}
                                        </p>
                                    )}
                                </div>
                                {!isPublic && (
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-black text-white">₱{price.toLocaleString()}</span>
                                        <p className="text-[7px] font-bold text-gray-500 tracking-widest uppercase">Payout</p>
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Detail Row */}
                            {!isPublic && (vehicleLabel || booking.vehicle?.plateNumber) && (
                                <div className="flex items-center justify-between w-full pt-2.5 border-t border-white/[0.05]">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold min-w-0">
                                        <div className="w-7 h-6 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {vehicleImage ? (
                                                <img src={vehicleImage} alt="Car" className="w-full h-full object-cover" />
                                            ) : (
                                                <Car size={12} className="text-cyan-400" />
                                            )}
                                        </div>
                                        <span className="truncate">{vehicleLabel || 'Vehicle'}</span>
                                    </div>
                                    {booking.vehicle?.plateNumber && (
                                        <span className="bg-black/40 border border-white/10 text-[9px] font-mono font-bold px-2 py-0.5 rounded text-gray-300">
                                            {booking.vehicle.plateNumber}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Click Action Indicator */}
                            {!isPublic && (
                                <div className="flex justify-end items-center w-full text-[9px] font-bold text-primary tracking-wider gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                    Manage Details
                                    <ChevronRight size={10} className="stroke-[2.5]" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
};


interface MechanicCalendarProps {
    bookings: Booking[];
    unavailableDates: Array<{ startDate: string; endDate: string; reason?: string }>;
    isPublic?: boolean;
}

const MechanicCalendar: React.FC<MechanicCalendarProps> = ({ bookings, unavailableDates, isPublic }) => {
    const { db } = useDatabase();
    const [view, setView] = useState<CalendarView>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewingBookings, setViewingBookings] = useState<{ date: Date; bookings: Booking[] } | null>(null);

    const changeDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else if (view === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
        else newDate.setDate(newDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    const renderHeader = () => {
        let title = '';
        if (view === 'month') title = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        else if (view === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            title = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else {
            title = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }

        return (
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-xl text-white tracking-tight leading-none">{title}</h3>
                <div className="flex gap-2">
                    <button onClick={() => changeDate(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 active:scale-95 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={() => changeDate(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 active:scale-95 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        const statusDotColors: Record<BookingStatus, string> = {
            Completed: 'bg-green-500',
            Upcoming: 'bg-blue-500',
            'En Route': 'bg-yellow-500',
            'In Progress': 'bg-teal-500',
            Cancelled: 'bg-red-500',
            'Booking Confirmed': 'bg-cyan-500',
            'Mechanic Assigned': 'bg-sky-500',
            'Reschedule Requested': 'bg-orange-500',
            'Work Done': 'bg-emerald-500',
        };

        const days = Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="border-r border-t border-white/5 bg-black/20"></div>);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.toDateString() === today.toDateString();

            const dayBookings = bookings.filter(b => b.date === dateStr);
            const isTimeOff = unavailableDates.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                const end = new Date(d.endDate.replace(/-/g, '/'));
                end.setHours(0, 0, 0, 0);
                return date >= start && date <= end;
            });

            days.push(
                <button
                    key={day}
                    disabled={dayBookings.length === 0}
                    onClick={() => dayBookings.length > 0 && setViewingBookings({ date, bookings: dayBookings })}
                    className={`p-2 border-r border-t border-white/5 min-h-[90px] sm:min-h-[110px] text-left align-top transition-all relative group ${isTimeOff ? 'bg-red-500/10' : 'bg-[#1A1A1A]'} ${dayBookings.length > 0 ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] sm:text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-500 group-hover:text-white'}`}>
                            {day}
                        </span>
                        {isTimeOff && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                    </div>
                    {dayBookings.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {dayBookings.slice(0, 3).map(b => (
                                <div key={b.id} className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[b.status] || 'bg-gray-500'} shadow-sm`}></div>
                                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 truncate opacity-0 sm:opacity-100  tracking-tighter">
                                        {b.time.split(' ')[0]}
                                    </span>
                                </div>
                            ))}
                            {dayBookings.length > 3 && (
                                <div className="text-[8px] text-gray-600 font-bold tracking-wider pl-3">
                                    +{dayBookings.length - 3} more
                                </div>
                            )}
                        </div>
                    )}
                </button>
            );
        }

        return (
            <div className="animate-fadeIn">
                <div className="grid grid-cols-7 text-center text-[10px] text-gray-500 font-bold tracking-wider mb-3 bg-white/5 py-3 rounded-2xl border border-white/5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 border-l border-b border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    {days}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = bookings.filter(b => b.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
        const isTimeOff = unavailableDates.some(d => {
            const start = new Date(d.startDate.replace(/-/g, '/'));
            start.setHours(0, 0, 0, 0);
            const end = new Date(d.endDate.replace(/-/g, '/'));
            end.setHours(0, 0, 0, 0);
            return currentDate >= start && currentDate <= end;
        });

        if (isTimeOff) {
            return <div className="text-center p-8 bg-red-900/20 rounded-md">You have scheduled this day off.</div>
        }

        const statusColors: Record<BookingStatus, string> = {
            Completed: 'bg-green-500/25 text-green-300 border border-green-500/20',
            Upcoming: 'bg-blue-500/25 text-blue-300 border border-blue-500/20',
            'En Route': 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/20',
            'In Progress': 'bg-teal-500/25 text-teal-300 border border-teal-500/20',
            Cancelled: 'bg-red-500/25 text-red-300 border border-red-500/20',
            'Booking Confirmed': 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/20',
            'Mechanic Assigned': 'bg-sky-500/25 text-sky-300 border border-sky-500/20',
            'Reschedule Requested': 'bg-orange-500/25 text-orange-300 border border-orange-500/20',
            'Work Done': 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20',
        };

        return (
            <div className="space-y-3 animate-fadeIn">
                {dayBookings.length > 0 ? dayBookings.map(b => {
                    const payout = b.service?.price || b.services?.[0]?.price || b.totalAmount || 0;
                    const vehicleLabel = b.vehicle
                        ? `${b.vehicle.year || ''} ${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim()
                        : '';
                    const customer = db?.customers?.find(c => c.id === b.customerId || c.name === b.customerName);
                    const avatarUrl = customer?.picture || b.customerAvatar || b.customerImage;
                    const vehicleImage = b.vehicle?.image || b.vehicle?.imageUrl || b.vehicleImage || b.imageUrl;
                    const initials = (b.customerName || 'C').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                        <div 
                            key={b.id} 
                            onClick={() => !isPublic && setViewingBookings({ date: currentDate, bookings: [b] })} 
                            className="bg-[#1A1A1A] p-4 rounded-3xl flex flex-col gap-3.5 cursor-pointer hover:bg-white/[0.04] transition-all border border-white/5 hover:border-primary/20 shadow-lg group relative overflow-hidden"
                        >
                            {/* Accent Glow */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-80" />

                            {/* Header row: Time and Status */}
                            <div className="flex justify-between items-center pl-1.5">
                                <div className="flex items-center gap-1.5 text-primary text-xs font-black tracking-wider uppercase">
                                    <Clock size={12} className="stroke-[2.5]" />
                                    {b.time}
                                </div>
                                <span className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase ${statusColors[b.status] || 'bg-gray-500/20 text-gray-300'}`}>
                                    {isPublic
                                        ? (b.status === 'Completed' || b.status === 'Cancelled' ? b.status : 'Booked')
                                        : b.status
                                    }
                                </span>
                            </div>

                            {/* Client & Service Section */}
                            <div className="flex items-start gap-3 pl-1.5">
                                {!isPublic && (
                                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center relative bg-black/20">
                                        <img
                                            src={avatarUrl || '/riders-logo.png'}
                                            alt={b.customerName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                        />
                                    </div>
                                )}
                                <div className="flex-grow min-w-0">
                                    <h4 className="text-sm font-black text-white leading-tight group-hover:text-primary transition-colors truncate">
                                        {b.service?.name || b.services?.[0]?.name || 'Service'}
                                    </h4>
                                    {!isPublic && (
                                        <p className="text-xs text-gray-400 font-semibold truncate mt-1">
                                            {b.customerName}
                                        </p>
                                    )}
                                </div>
                                {!isPublic && payout > 0 && (
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-black text-white">₱{payout.toLocaleString()}</span>
                                        <p className="text-[7px] font-bold text-gray-500 tracking-widest uppercase">Potential Payout</p>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Rows (Vehicle & Address) */}
                            {!isPublic && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-white/[0.05] pl-1.5">
                                    {/* Vehicle info */}
                                    {(vehicleLabel || b.vehicle?.plateNumber) && (
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold min-w-0">
                                            <div className="w-7 h-6 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {vehicleImage ? (
                                                    <img src={vehicleImage} alt="Car" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Car size={12} className="text-cyan-400" />
                                                )}
                                            </div>
                                            <span className="truncate">{vehicleLabel || 'Vehicle'}</span>
                                            {b.vehicle?.plateNumber && (
                                                <span className="bg-black/30 border border-white/10 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded text-gray-400">
                                                    {b.vehicle.plateNumber}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Location address */}
                                    {b.location?.address && (
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold min-w-0 sm:col-span-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate">{b.location.address}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }) : <p className="text-center text-light-gray p-8">No jobs scheduled for this day.</p>}
            </div>
        );
    }
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const weekDays = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ensure today is start of day for comparison

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.toDateString() === today.toDateString();
            const dayBookings = bookings.filter(b => b.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

            weekDays.push({ date, dateStr, isToday, dayBookings });
        }

        return (
            <div className="space-y-4 animate-fadeIn">
                {weekDays.map(({ date, dateStr, isToday, dayBookings }) => (
                    <div key={dateStr} className={`bg-[#1A1A1A] rounded-2xl border ${isToday ? 'border-primary/40 shadow-lg shadow-primary/10' : 'border-white/5'} overflow-hidden transition-all`}>
                        <div className={`px-4 py-2 flex justify-between items-center ${isToday ? 'bg-primary/10' : 'bg-white/5'}`}>
                            <span className={`text-[10px] font-bold tracking-wider ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                            {dayBookings.length > 0 && (
                                <span className="bg-white/5 text-[8px] font-bold px-2 py-0.5 rounded-full text-white/40 tracking-wider border border-white/5">
                                    {dayBookings.length} {dayBookings.length === 1 ? 'Job' : 'Jobs'}
                                </span>
                            )}
                        </div>
                        <div className="p-2 space-y-2">
                            {dayBookings.length > 0 ? (
                                dayBookings.map(b => (
                                    <div
                                        key={b.id}
                                        onClick={() => setViewingBookings({ date, bookings: dayBookings })}
                                        className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/5 cursor-pointer transition-all group"
                                    >
                                        <div className="w-16 text-[10px] font-bold text-primary shrink-0">{b.time}</div>
                                        <div className="flex-grow">
                                            <p className="text-xs font-bold text-white tracking-tight">{b.service?.name || b.services?.[0]?.name || 'Service'}</p>
                                            <p className="text-[9px] text-gray-500 font-medium">{b.customerName}</p>
                                        </div>
                                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-4 text-center">
                                    <span className="text-[10px] font-bold text-gray-600 tracking-wider">No Appointments</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-[#121212] p-4 sm:p-8 rounded-[3rem] border border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col gap-5 mb-8">
                <div>
                    {renderHeader()}
                </div>
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 text-[10px] font-bold tracking-wider w-fit">
                    <button onClick={() => setView('day')} className={`px-5 py-2 rounded-lg transition-all ${view === 'day' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Day</button>
                    <button onClick={() => setView('week')} className={`px-5 py-2 rounded-lg transition-all ${view === 'week' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Week</button>
                    <button onClick={() => setView('month')} className={`px-5 py-2 rounded-lg transition-all ${view === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Month</button>
                </div>
            </div>
            {view === 'month' && renderMonthView()}
            {view === 'day' && renderDayView()}
            {view === 'week' && renderWeekView()}

            {viewingBookings && (
                <DayDetailModal
                    date={viewingBookings.date}
                    bookings={viewingBookings.bookings}
                    onClose={() => setViewingBookings(null)}
                    isPublic={isPublic}
                />
            )}
        </div>
    );
};

export default MechanicCalendar;
