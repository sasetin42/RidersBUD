import React, { useMemo, useState, useEffect } from 'react';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { Booking, Task } from '../../types';
import { useNavigate } from 'react-router-dom';
import MechanicCalendar from '../../components/mechanic/MechanicCalendar';
import AssignedJobNotificationModal from '../../components/mechanic/AssignedJobNotificationModal';
import MechanicHeader from '../../components/mechanic/MechanicHeader';

// --- Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string }> = ({ title, value, icon, colorClass = "bg-[#252525]" }) => (
    <div className={`${colorClass} p-4 rounded-2xl flex items-center gap-4 border border-white/5 shadow-lg relative overflow-hidden group`}>
        <div className="bg-orange-500/10 text-orange-500 p-3 rounded-full flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{title}</p>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    </div>
);

const NewJobRequestModal: React.FC<{
    booking: Booking;
    onAccept: () => void;
    onDecline: () => void;
}> = ({ booking, onAccept, onDecline }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 shadow-2xl w-full max-w-sm text-white animate-scaleUp border border-orange-500/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-yellow-500"></div>
                <h2 className="font-bold text-2xl flex items-center gap-2 mb-4 text-white">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    New Job Request!
                </h2>
                <div className="space-y-4 text-gray-300">
                    <div className="flex justify-between items-center text-base border-b border-white/10 pb-2">
                        <span className="font-semibold text-sm uppercase tracking-wider text-gray-400">Service</span>
                        <span className="font-bold text-white">{booking.service.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-400">Vehicle</span>
                        <span className="text-white font-medium">{booking.vehicle.make} {booking.vehicle.model}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-400">Location</span>
                        <span className="text-white font-medium">Mandaluyong</span>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-xl flex justify-between items-center mt-2 border border-green-500/20">
                        <span className="font-semibold text-green-400">Est. Payout</span>
                        <span className="font-bold text-xl text-green-400">₱{booking.service.price.toLocaleString()}</span>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button onClick={onDecline} className="bg-[#2A2A2A] text-gray-300 font-bold py-3.5 rounded-xl hover:bg-[#333] transition border border-white/5 uppercase text-sm tracking-wide">Decline</button>
                    <button onClick={onAccept} className="bg-[#EA580C] text-white font-bold py-3.5 rounded-xl hover:bg-[#C2410C] transition shadow-lg shadow-orange-900/40 uppercase text-sm tracking-wide">Accept Job</button>
                </div>
            </div>
        </div>
    );
};

const DashboardTasksWidget: React.FC<{ tasks: Task[]; onAddTask: (text: string) => void; onToggleTask: (task: Task) => void }> = ({ tasks, onAddTask, onToggleTask }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const activeTasks = tasks.filter(t => !t.isComplete);
    const completedTasks = tasks.filter(t => t.isComplete);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onAddTask(newTaskText);
            setNewTaskText('');
        }
    };

    return (
        <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">My Tasks</h2>
                <span className="text-xs text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full font-medium">{activeTasks.length} pending</span>
            </div>

            <div className="space-y-3 mb-4 flex-grow overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
                {activeTasks.length === 0 && <p className="text-xs text-gray-500 italic text-center py-4">No pending tasks. Great job!</p>}

                {activeTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-sm group p-2 rounded-lg hover:bg-white/5 transition border border-transparent hover:border-white/5">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={task.isComplete}
                                onChange={() => onToggleTask(task)}
                                className="w-5 h-5 rounded border-gray-600 bg-[#252525] text-[#EA580C] focus:ring-offset-0 focus:ring-1 focus:ring-[#EA580C] cursor-pointer transition"
                            />
                        </div>
                        <span className="text-gray-300 group-hover:text-white transition-colors font-medium">{task.title}</span>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 mt-auto">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Add a quick task..."
                    className="flex-grow bg-[#252525] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition"
                />
                <button type="submit" className="bg-[#EA580C] text-white px-3.5 rounded-xl text-lg font-bold hover:bg-[#C2410C] transition shadow-lg shadow-orange-900/20 flex items-center justify-center aspect-square">+</button>
            </form>
        </div>
    );
};


const MechanicDashboardScreen: React.FC = () => {
    const { mechanic, updateOnlineStatus, loading: authLoading } = useMechanicAuth();
    const { db, loading: dbLoading, acceptJobRequest, addTask, updateTask } = useDatabase();
    const navigate = useNavigate();
    const loading = authLoading || dbLoading;

    const isOnline = mechanic?.isOnline ?? true;
    const [newJobRequest, setNewJobRequest] = useState<Booking | null>(null);
    const [newAssignedJob, setNewAssignedJob] = useState<Booking | null>(null);

    // Find the currently active job for the mechanic
    const ongoingJob = useMemo(() => {
        if (!mechanic || !db) return null;
        return db.bookings.find(b => b.mechanic?.id === mechanic.id && (b.status === 'En Route' || b.status === 'In Progress'));
    }, [mechanic, db]);

    const myBookings = useMemo(() => {
        if (!mechanic || !db) return [];
        return db.bookings.filter(b => b.mechanic?.id === mechanic.id && b.status !== 'Cancelled');
    }, [db, mechanic]);

    const myTasks = useMemo(() => {
        if (!mechanic || !db) return [];
        return db.tasks?.filter(t => t.mechanicId === mechanic.id) || [];
    }, [db, mechanic]);

    const analyticsData = useMemo(() => {
        if (!mechanic || !db) return null;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const myJobsToday = db.bookings.filter(b => b.mechanic?.id === mechanic.id && b.date === todayStr);

        const jobsCompletedToday = myJobsToday.filter(b => b.status === 'Completed');
        const earningsToday = jobsCompletedToday.reduce((sum, job) => sum + job.service.price, 0);

        const timeTo24h = (timeStr: string) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') {
                hours = '00';
            }
            if (modifier === 'PM') {
                hours = (parseInt(hours, 10) + 12).toString();
            }
            return `${hours.padStart(2, '0')}:${minutes}`;
        };

        const agendaJobs = myJobsToday
            .filter(b => b.status === 'Upcoming' || b.status === 'En Route')
            .sort((a, b) => timeTo24h(a.time).localeCompare(timeTo24h(b.time)));

        return {
            earningsToday,
            jobsCompletedTodayCount: jobsCompletedToday.length,
            agendaJobs,
            agendaCount: agendaJobs.length
        };
    }, [db, mechanic]);

    const lifetimeStats = useMemo(() => {
        if (!mechanic || !db) return { averageJobValue: 0 };
        const completedJobs = db.bookings.filter(b => b.mechanic?.id === mechanic.id && b.status === 'Completed');
        if (completedJobs.length === 0) return { averageJobValue: 0 };
        const totalEarnings = completedJobs.reduce((sum, job) => sum + job.service.price, 0);
        const averageJobValue = totalEarnings / completedJobs.length;
        return { averageJobValue };
    }, [db, mechanic]);

    // Checks for new jobs
    useEffect(() => {
        if (!db || !isOnline || ongoingJob) {
            setNewJobRequest(null);
            return;
        };
        const declinedJobsJSON = sessionStorage.getItem(`declinedJobs_${mechanic?.id}`);
        const declinedJobIds: string[] = declinedJobsJSON ? JSON.parse(declinedJobsJSON) : [];
        const latestUnassignedJob = db.bookings
            .filter(b => b.status === 'Upcoming' && !b.mechanic && !declinedJobIds.includes(b.id))
            .sort((a, b) => b.id.localeCompare(a.id))[0];
        if (latestUnassignedJob && latestUnassignedJob.id !== newJobRequest?.id) {
            setNewJobRequest(latestUnassignedJob);
        } else if (!latestUnassignedJob && newJobRequest) setNewJobRequest(null);
    }, [db, isOnline, ongoingJob, mechanic, newJobRequest]);

    // Checks for assigned jobs
    useEffect(() => {
        if (!mechanic || !db) return;
        const sessionNotifiedKey = `notifiedBookings_${mechanic.id}`;
        const notifiedBookingIds: Set<string> = new Set(JSON.parse(sessionStorage.getItem(sessionNotifiedKey) || '[]'));
        const myUnseenBookings = db.bookings.filter(b => b.mechanic?.id === mechanic.id && !notifiedBookingIds.has(b.id));

        if (myUnseenBookings.length > 0) {
            const newestUnseenBooking = myUnseenBookings.sort((a, b) => b.id.localeCompare(a.id))[0];
            if (newestUnseenBooking.id !== newAssignedJob?.id) setNewAssignedJob(newestUnseenBooking);
            myUnseenBookings.forEach(b => notifiedBookingIds.add(b.id));
            sessionStorage.setItem(sessionNotifiedKey, JSON.stringify(Array.from(notifiedBookingIds)));
        }
    }, [db, mechanic, newAssignedJob]);

    const handleAcceptJob = () => {
        if (newJobRequest && mechanic) {
            acceptJobRequest(newJobRequest.id, mechanic);
            setNewJobRequest(null);
        }
    };

    const handleDeclineJob = () => {
        if (!newJobRequest || !mechanic) return;
        const declinedJobsJSON = sessionStorage.getItem(`declinedJobs_${mechanic.id}`);
        const declinedJobIds: string[] = declinedJobsJSON ? JSON.parse(declinedJobsJSON) : [];
        if (!declinedJobIds.includes(newJobRequest.id)) {
            declinedJobIds.push(newJobRequest.id);
            sessionStorage.setItem(`declinedJobs_${mechanic.id}`, JSON.stringify(declinedJobIds));
        }
        setNewJobRequest(null);
    };

    const handleQuickAddTask = async (title: string) => {
        if (mechanic) {
            await addTask({
                mechanicId: mechanic.id,
                title: title,
                dueDate: new Date().toISOString().split('T')[0],
                priority: 'Medium',
            });
        }
    };

    const handleQuickToggleTask = async (task: Task) => {
        await updateTask({ ...task, isComplete: !task.isComplete });
    };

    if (loading || !db || !mechanic) {
        return <div className="flex bg-[#121212] h-full items-center justify-center"><Spinner size="lg" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white overflow-hidden">
            {isOnline && newJobRequest && !ongoingJob && <NewJobRequestModal booking={newJobRequest} onAccept={handleAcceptJob} onDecline={handleDeclineJob} />}
            {newAssignedJob && <AssignedJobNotificationModal booking={newAssignedJob} onClose={() => setNewAssignedJob(null)} />}

            {/* Header */}
            <MechanicHeader />

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto px-5 pb-24 space-y-6 custom-scrollbar">

                {/* Ongoing Job Card */}
                {ongoingJob && (
                    <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-cyan-400"></div>
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-lg font-bold text-white mb-1">Ongoing Job</h2>
                            <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                {ongoingJob.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 bg-[#252525] rounded-full flex items-center justify-center border border-white/10 text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="font-bold text-lg text-white">{ongoingJob.customerName}</p>
                                <p className="text-sm text-gray-400 font-medium">{ongoingJob.vehicle.year} {ongoingJob.vehicle.make} {ongoingJob.vehicle.model}</p>
                            </div>
                        </div>

                        <button onClick={() => navigate(`/mechanic/job/${ongoingJob.id}`)} className="w-full bg-[#EA580C] text-white font-bold py-3.5 rounded-xl hover:bg-[#C2410C] transition shadow-lg shadow-orange-900/30 text-sm uppercase tracking-wide">
                            View Details
                        </button>
                    </div>
                )}

                {analyticsData && (
                    <>
                        {/* Calendar */}
                        <div>
                            <h2 className="text-lg font-bold text-white mb-3 pl-1">My Calendar</h2>
                            <div className="bg-[#1A1A1A] rounded-2xl p-1 border border-white/5">
                                <MechanicCalendar bookings={myBookings} unavailableDates={mechanic.unavailableDates || []} />
                            </div>
                        </div>

                        {/* Summary Grid */}
                        <div>
                            <h2 className="text-lg font-bold text-white mb-3 pl-1">Today's Summary</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard title="Earnings Today" value={`₱${analyticsData.earningsToday.toLocaleString()}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>} />
                                <StatCard title="Jobs Completed" value={analyticsData.jobsCompletedTodayCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} />
                                <StatCard title="Today's Agenda" value={analyticsData.agendaCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                                <StatCard title="Avg. Job Value" value={`₱${lifetimeStats.averageJobValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.963 6 10 6c.045 0 .09.003.132.008l.322-1.768A2.5 2.5 0 007.41 5.952l1.326 1.027zm-1.854 1.708l1.378-1.066a2.5 2.5 0 00-1.293-1.378l-1.066 1.378.981 1.066zM5.5 10c0 .654.12 1.26.335 1.812L4.06 13.06A6 6 0 0110 4v2a4 4 0 00-3.328 1.54l-1.127 2.222.955.238zM14.5 10a4 4 0 00-3.328-1.54l1.127-2.222-.955-.238A6 6 0 0110 16v-2a4 4 0 003.328-1.54l1.127 2.222-.955.238z" clipRule="evenodd" /></svg>} />
                            </div>
                        </div>

                        {/* Tasks */}
                        <DashboardTasksWidget tasks={myTasks} onAddTask={handleQuickAddTask} onToggleTask={handleQuickToggleTask} />

                        {/* Agenda List */}
                        <div>
                            <h2 className="text-lg font-bold text-white mb-3 pl-1">Today's Agenda</h2>
                            <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 overflow-hidden">
                                {analyticsData.agendaJobs.length > 0 ? (
                                    analyticsData.agendaJobs.map(job => (
                                        <div key={job.id} onClick={() => navigate(`/mechanic/job/${job.id}`)} className="flex items-center p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition">
                                            <div className="w-24 text-sm font-bold text-orange-500">{job.time}</div>
                                            <div className="flex-grow">
                                                <p className="font-bold text-white">{job.service.name}</p>
                                                <p className="text-xs text-gray-500">{job.customerName}</p>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm italic">No jobs scheduled for today yet.</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {!ongoingJob && (!newJobRequest || !isOnline) && analyticsData?.agendaJobs.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        <p>{isOnline ? "Waiting for new job requests..." : "You are currently Offline."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MechanicDashboardScreen;
