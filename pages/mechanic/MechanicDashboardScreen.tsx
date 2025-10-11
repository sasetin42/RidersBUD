import React, { useMemo, useState, useEffect } from 'react';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { Booking } from '../../types';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-dark-gray p-4 rounded-lg flex items-center gap-4">
        <div className="bg-primary/20 text-primary p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-light-gray">{title}</p>
        </div>
    </div>
);


const MechanicDashboardScreen: React.FC = () => {
    const { mechanic } = useMechanicAuth();
    const { db, loading, acceptJobRequest } = useDatabase();
    const navigate = useNavigate();

    const [isOnline, setIsOnline] = useState(true);
    const [newJobRequest, setNewJobRequest] = useState<Booking | null>(null);

    // Find the currently active job for the mechanic
    const ongoingJob = useMemo(() => {
        if (!mechanic || !db) return null;
        return db.bookings.find(b => b.mechanic?.id === mechanic.id && (b.status === 'En Route' || b.status === 'In Progress'));
    }, [mechanic, db]);
    
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
    
    // Simulate finding a new job request
    useEffect(() => {
        if (!db || newJobRequest || ongoingJob || !isOnline) return;

        const timer = setTimeout(() => {
            const unassignedJob = db.bookings.find(b => b.status === 'Upcoming' && !b.mechanic);
            if (unassignedJob) {
                setNewJobRequest(unassignedJob);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [db, newJobRequest, ongoingJob, isOnline]);

    const handleAcceptJob = () => {
        if (newJobRequest && mechanic) {
            acceptJobRequest(newJobRequest.id, mechanic);
            setNewJobRequest(null);
        }
    };

    const handleDeclineJob = () => {
        setNewJobRequest(null);
    };

    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <div className="p-4 bg-[#1D1D1D] border-b border-dark-gray">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                </div>
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            {/* Custom Header */}
            <div className="p-4 bg-[#1D1D1D] border-b border-dark-gray flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm text-light-gray">Welcome back, {mechanic.name.split(' ')[0]}!</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className={`${isOnline ? 'bg-green-500' : 'bg-field'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-gray`}
                        onClick={() => setIsOnline(!isOnline)}
                        aria-pressed={isOnline}
                    >
                        <span className={`${isOnline ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                    <span className={`text-sm font-semibold ${isOnline ? 'text-green-400' : 'text-light-gray'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            
            <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* New Job Request */}
                {isOnline && newJobRequest && !ongoingJob && (
                    <div className="bg-orange-100 border-2 border-primary rounded-lg p-4 text-secondary shadow-lg animate-fadeIn">
                        <h2 className="font-bold text-lg flex items-center gap-2 mb-2 text-gray-800">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            New Job Request!
                        </h2>
                        <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm text-gray-700">
                            <span className="font-semibold">Service:</span><span>{newJobRequest.service.name}</span>
                            <span className="font-semibold">Location:</span><span>Mandaluyong</span>
                            <span className="font-semibold">Payout:</span><span>~₱{newJobRequest.service.price.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button onClick={handleDeclineJob} className="bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition">Decline</button>
                            <button onClick={handleAcceptJob} className="bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition">Accept</button>
                        </div>
                    </div>
                )}

                {/* Ongoing Job */}
                {ongoingJob && (
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-white mb-4">Ongoing Job</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-field rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-light-gray" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="font-bold text-white">{ongoingJob.customerName}</p>
                                <p className="text-sm text-light-gray">{`${ongoingJob.vehicle.year} ${ongoingJob.vehicle.make} ${ongoingJob.vehicle.model}`}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                            <span className="font-semibold text-light-gray">Status:</span>
                            <span className="font-bold text-blue-400">{ongoingJob.status}</span>
                        </div>
                        <button onClick={() => navigate(`/mechanic/job/${ongoingJob.id}`)} className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition mt-4">
                            View Details
                        </button>
                    </div>
                )}
                
                {analyticsData && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-3">Today's Summary</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <StatCard title="Earnings Today" value={`₱${analyticsData.earningsToday.toLocaleString()}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                                <StatCard title="Jobs Completed" value={analyticsData.jobsCompletedTodayCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-6H3.5A2.5 2.5 0 001 4.5v15A2.5 2.5 0 003.5 22h17a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0020.5 2H15" /></svg>} />
                                <StatCard title="Today's Agenda" value={analyticsData.agendaCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                                <StatCard 
                                    title="Average Job Value" 
                                    value={`₱${lifetimeStats.averageJobValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 2v.01" /></svg>}
                                />
                            </div>
                        </div>
                        
                        {analyticsData.agendaJobs.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-3">Today's Agenda</h2>
                                <div className="bg-dark-gray rounded-lg">
                                    {analyticsData.agendaJobs.map((job, index) => (
                                        <div 
                                            key={job.id} 
                                            onClick={() => navigate(`/mechanic/job/${job.id}`)}
                                            className={`flex items-center p-4 cursor-pointer hover:bg-field ${index < analyticsData.agendaJobs.length - 1 ? 'border-b border-field' : ''}`}
                                        >
                                            <div className="w-1/4 text-sm font-semibold text-primary">{job.time}</div>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-white text-sm">{job.service.name}</p>
                                                <p className="text-xs text-light-gray">{job.customerName}</p>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {!ongoingJob && (!newJobRequest || !isOnline) && analyticsData?.agendaJobs.length === 0 && (
                     <div className="text-center text-light-gray pt-16">
                        <p>{isOnline ? "You have no jobs on your agenda. Waiting for new requests..." : "You are offline. Go online to receive jobs."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MechanicDashboardScreen;