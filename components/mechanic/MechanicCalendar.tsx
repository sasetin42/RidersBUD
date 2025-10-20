import React, { useState } from 'react';
import { Booking, BookingStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import Modal from '../admin/Modal';

type CalendarView = 'month' | 'week' | 'day';

interface MechanicCalendarProps {
    bookings: Booking[];
    unavailableDates: Array<{ startDate: string; endDate: string; reason?: string }>;
}

const DayDetailModal: React.FC<{
    date: Date;
    bookings: Booking[];
    onClose: () => void;
}> = ({ date, bookings, onClose }) => {
    const navigate = useNavigate();

    const statusColors: Record<BookingStatus, string> = {
        Completed: 'bg-green-500/20 text-green-300',
        Upcoming: 'bg-blue-500/20 text-blue-300',
        'En Route': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-purple-500/20 text-purple-300',
        Cancelled: 'bg-red-500/20 text-red-300',
        'Booking Confirmed': 'bg-cyan-500/20 text-cyan-300',
        'Mechanic Assigned': 'bg-sky-500/20 text-sky-300',
    };

    return (
        <Modal 
            title={`Jobs for ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
            isOpen={true} 
            onClose={onClose}
        >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {bookings.map(booking => (
                    <button 
                        key={booking.id}
                        onClick={() => navigate(`/mechanic/job/${booking.id}`)}
                        className="w-full text-left bg-field p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-600 transition-colors"
                    >
                        <div>
                            <p className="font-semibold text-primary">{booking.time}</p>
                            <p className="text-sm font-medium text-white">{booking.service.name}</p>
                            <p className="text-xs text-light-gray">{booking.customerName}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[booking.status] || ''}`}>
                            {booking.status}
                        </span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};


const MechanicCalendar: React.FC<MechanicCalendarProps> = ({ bookings, unavailableDates }) => {
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
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-field">&lt;</button>
                <h3 className="font-bold text-lg">{title}</h3>
                <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-field">&gt;</button>
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
        };

        const days = Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="border-r border-t border-field"></div>);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.toDateString() === today.toDateString();

            const dayBookings = bookings.filter(b => b.date === dateStr);
            const isTimeOff = unavailableDates.some(d => {
                const start = new Date(d.startDate.replace(/-/g,'/'));
                start.setHours(0,0,0,0);
                const end = new Date(d.endDate.replace(/-/g,'/'));
                end.setHours(0,0,0,0);
                return date >= start && date <= end;
            });
            
            days.push(
                <button 
                    key={day} 
                    disabled={dayBookings.length === 0}
                    onClick={() => dayBookings.length > 0 && setViewingBookings({ date, bookings: dayBookings })}
                    className={`p-1.5 border-r border-t border-field min-h-[80px] text-left align-top ${isTimeOff ? 'bg-red-900/30' : ''} ${dayBookings.length > 0 ? 'cursor-pointer hover:bg-field' : 'cursor-default'}`}
                >
                    <span className={`text-xs ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-bold' : ''}`}>{day}</span>
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
                <div className="grid grid-cols-7 text-center text-xs text-light-gray font-semibold mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 border-l border-b border-field">{days}</div>
            </>
        );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = bookings.filter(b => b.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
        const isTimeOff = unavailableDates.some(d => {
            const start = new Date(d.startDate.replace(/-/g,'/'));
            start.setHours(0,0,0,0);
            const end = new Date(d.endDate.replace(/-/g,'/'));
            end.setHours(0,0,0,0);
            return currentDate >= start && currentDate <= end;
        });

        if (isTimeOff) {
            return <div className="text-center p-8 bg-red-900/20 rounded-md">You have scheduled this day off.</div>
        }

        return (
            <div className="space-y-2">
                {dayBookings.length > 0 ? dayBookings.map(b => (
                     <div key={b.id} onClick={() => setViewingBookings({ date: currentDate, bookings: dayBookings })} className="bg-primary/20 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-primary/40">
                        <div>
                            <p className="font-semibold text-primary">{b.time}</p>
                            <p className="text-sm font-medium">{b.service.name}</p>
                            <p className="text-xs text-light-gray">{b.customerName}</p>
                        </div>
                         <span className="text-xs font-semibold bg-primary/50 px-2 py-1 rounded-full">{b.status}</span>
                    </div>
                )) : <p className="text-center text-light-gray p-8">No jobs scheduled for this day.</p>}
            </div>
        )
    }

    return (
        <div className="bg-dark-gray p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                {renderHeader()}
                <div className="flex p-1 bg-field rounded-full text-xs">
                    <button onClick={() => setView('day')} className={`px-3 py-1 rounded-full ${view === 'day' ? 'bg-primary' : ''}`}>Day</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 rounded-full ${view === 'week' ? 'bg-primary' : ''}`}>Week</button>
                    <button onClick={() => setView('month')} className={`px-3 py-1 rounded-full ${view === 'month' ? 'bg-primary' : ''}`}>Month</button>
                </div>
            </div>
            {view === 'month' && renderMonthView()}
            {view === 'day' && renderDayView()}
            {view === 'week' && <p className="text-center text-light-gray py-8">Weekly view is coming soon!</p>}
            
            {viewingBookings && (
                <DayDetailModal
                    date={viewingBookings.date}
                    bookings={viewingBookings.bookings}
                    onClose={() => setViewingBookings(null)}
                />
            )}
        </div>
    );
};

export default MechanicCalendar;
