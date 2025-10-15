import React, { useState } from 'react';
import { Booking } from '../../types';
import { useNavigate } from 'react-router-dom';

type CalendarView = 'month' | 'week' | 'day';

interface MechanicCalendarProps {
    bookings: Booking[];
    unavailableDates: Array<{ startDate: string; endDate: string; reason?: string }>;
}

const MechanicCalendar: React.FC<MechanicCalendarProps> = ({ bookings, unavailableDates }) => {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const navigate = useNavigate();

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
                <div key={day} className={`p-1.5 border-r border-t border-field min-h-[80px] ${isTimeOff ? 'bg-red-900/30' : ''}`}>
                    <span className={`text-xs ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-bold' : ''}`}>{day}</span>
                    {dayBookings.length > 0 && <div className="mt-1 bg-primary/50 text-white text-[10px] text-center rounded px-1 py-0.5">{dayBookings.length} job{dayBookings.length > 1 ? 's':''}</div>}
                </div>
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
                     <div key={b.id} onClick={() => navigate(`/mechanic/job/${b.id}`)} className="bg-primary/20 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-primary/40">
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
        </div>
    );
};

export default MechanicCalendar;
