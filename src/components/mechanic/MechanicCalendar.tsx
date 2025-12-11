import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import Modal from '../admin/Modal';

type CalendarView = 'month' | 'week' | 'day';

interface DayDetailModalProps {
    date: Date;
    bookings: Booking[];
    onClose: () => void;
    isPublic?: boolean;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, bookings, onClose, isPublic }) => {
    const navigate = useNavigate();

    const handleItemClick = (booking: Booking) => {
        if (isPublic) {
            return; // Not clickable for public view
        }
        navigate(`/mechanic/job/${booking.id}`);
    };

    const statusColors: Record<BookingStatus, string> = {
        Completed: 'bg-green-500/20 text-green-300',
        Upcoming: 'bg-blue-500/20 text-blue-300',
        'En Route': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-purple-500/20 text-purple-300',
        Cancelled: 'bg-red-500/20 text-red-300',
        'Booking Confirmed': 'bg-cyan-500/20 text-cyan-300',
        'Mechanic Assigned': 'bg-sky-500/20 text-sky-300',
        'Reschedule Requested': 'bg-orange-500/20 text-orange-300',
    };

    return (
        <Modal
            title={`Jobs for ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
            isOpen={true}
            onClose={onClose}
        >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {bookings.map(booking => (
                    <button
                        key={booking.id}
                        onClick={() => handleItemClick(booking)}
                        className={`w-full text-left bg-[#252525] p-3 rounded-lg flex justify-between items-center border border-white/5 transition ${!isPublic ? 'cursor-pointer hover:bg-[#333]' : 'cursor-default'}`}
                    >
                        <div>
                            <p className="font-semibold text-white">{booking.time}</p>
                            {isPublic ? (
                                <p className="text-sm font-medium text-gray-400">Booked Slot</p>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-gray-300">{booking.service.name}</p>
                                    <p className="text-xs text-gray-500">{booking.customerName}</p>
                                </>
                            )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[booking.status] || ''}`}>
                            {isPublic
                                ? (booking.status === 'Completed' || booking.status === 'Cancelled' ? booking.status : 'Booked')
                                : booking.status
                            }
                        </span>
                    </button>
                ))}
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
    const [view, setView] = useState<CalendarView>('month');
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
            <div className="flex justify-between items-center mb-4 text-white">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-[#252525] transition">&lt;</button>
                <h3 className="font-bold text-lg">{title}</h3>
                <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-[#252525] transition">&gt;</button>
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
            'In Progress': 'bg-purple-500',
            Cancelled: 'bg-red-500',
            'Booking Confirmed': 'bg-cyan-500',
            'Mechanic Assigned': 'bg-sky-500',
            'Reschedule Requested': 'bg-orange-500',
        };

        const days = Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="border-r border-t border-white/5 min-h-[80px]"></div>);

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
                    className={`p-1.5 border-r border-t border-white/5 min-h-[80px] text-left align-top transition ${isTimeOff ? 'bg-red-900/20' : ''} ${dayBookings.length > 0 ? 'cursor-pointer hover:bg-[#252525]' : 'cursor-default'}`}
                >
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#EA580C] text-white font-bold' : 'text-gray-400'}`}>{day}</span>
                    {dayBookings.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {dayBookings.slice(0, 4).map(b => (
                                <div key={b.id} className={`w-1.5 h-1.5 rounded-full ${statusDotColors[b.status] || 'bg-gray-500'}`} title={`${b.service.name} - ${b.status}`}></div>
                            ))}
                        </div>
                    )}
                </button>
            );
        }

        return (
            <>
                <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-semibold mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 border-l border-b border-white/5 rounded-lg overflow-hidden">{days}</div>
            </>
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
            return <div className="text-center p-8 bg-red-900/20 rounded-md text-red-300">You have scheduled this day off.</div>
        }

        return (
            <div className="space-y-2">
                {dayBookings.length > 0 ? dayBookings.map(b => (
                    <div key={b.id} onClick={() => setViewingBookings({ date: currentDate, bookings: dayBookings })} className="bg-[#252525] p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-[#333] border border-white/5">
                        <div>
                            <p className="font-semibold text-white">{b.time}</p>
                            <p className="text-sm font-medium text-gray-300">{b.service.name}</p>
                            <p className="text-xs text-gray-500">{b.customerName}</p>
                        </div>
                        <span className="text-xs font-semibold bg-[#EA580C]/20 text-[#EA580C] px-2 py-1 rounded-full">{b.status}</span>
                    </div>
                )) : <p className="text-center text-gray-500 p-8">No jobs scheduled for this day.</p>}
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4">
                {renderHeader()}
                <div className="flex p-1 bg-[#252525] rounded-full text-xs border border-white/5">
                    <button onClick={() => setView('day')} className={`px-3 py-1 rounded-full transition ${view === 'day' ? 'bg-[#EA580C] text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Day</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 rounded-full transition ${view === 'week' ? 'bg-[#EA580C] text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Week</button>
                    <button onClick={() => setView('month')} className={`px-3 py-1 rounded-full transition ${view === 'month' ? 'bg-[#EA580C] text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Month</button>
                </div>
            </div>
            {view === 'month' && renderMonthView()}
            {view === 'day' && renderDayView()}
            {view === 'week' && <p className="text-center text-gray-500 py-8 italic">Weekly view is coming soon!</p>}

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