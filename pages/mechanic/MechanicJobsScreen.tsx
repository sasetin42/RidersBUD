import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { Booking, BookingStatus } from '../../types';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';

const JobHistoryCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const navigate = useNavigate();

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-500/20 text-blue-300',
        'En Route': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-purple-500/20 text-purple-300',
        Completed: 'bg-green-500/20 text-green-300',
        Cancelled: 'bg-red-500/20 text-red-300',
        'Booking Confirmed': 'bg-cyan-500/20 text-cyan-300',
        'Mechanic Assigned': 'bg-sky-500/20 text-sky-300',
    };

    return (
        <div 
            className="bg-dark-gray p-4 rounded-lg cursor-pointer hover:bg-field transition-colors"
            onClick={() => navigate(`/mechanic/job/${booking.id}`)}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-base font-bold text-white">{booking.service.name}</h3>
                    <p className="text-sm text-light-gray">{booking.customerName}</p>
                    <p className="text-xs text-gray-400">{new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at {booking.time}</p>
                </div>
                 <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                        {booking.status}
                    </span>
                    {booking.status === 'Completed' && (
                        <p className="font-bold text-base text-green-400">
                            + ₱{booking.service.price.toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};


const MechanicJobsScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'inProgress' | 'past'>('upcoming');
    
    const { upcomingJobs, inProgressJobs, pastJobs } = useMemo(() => {
        if (!mechanic || !db) {
            return { upcomingJobs: [], inProgressJobs: [], pastJobs: [] };
        }

        const myJobs = db.bookings
            .filter(b => b.mechanic?.id === mechanic.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
        const upcoming = myJobs.filter(j => j.status === 'Upcoming' || j.status === 'En Route' || j.status === 'Booking Confirmed' || j.status === 'Mechanic Assigned');
        const inProgress = myJobs.filter(j => j.status === 'In Progress');
        const past = myJobs.filter(j => j.status === 'Completed' || j.status === 'Cancelled');
        
        return { upcomingJobs: upcoming, inProgressJobs: inProgress, pastJobs: past };
    }, [db, mechanic]);


    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Job History" />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    const jobsToDisplay = activeTab === 'upcoming' ? upcomingJobs : activeTab === 'inProgress' ? inProgressJobs : pastJobs;

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Job History" />

            <div className="border-b border-dark-gray flex-shrink-0 px-4">
                <nav className="flex space-x-4" aria-label="Tabs">
                     <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white'}`}
                    >
                        Upcoming ({upcomingJobs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('inProgress')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'inProgress' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white'}`}
                    >
                        In Progress ({inProgressJobs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'past' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white'}`}
                    >
                        Past Jobs ({pastJobs.length})
                    </button>
                </nav>
            </div>
            
            <main className="flex-grow overflow-y-auto p-4">
                {jobsToDisplay.length > 0 ? (
                    <div className="space-y-4">
                        {jobsToDisplay.map(job => <JobHistoryCard key={job.id} booking={job} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-light-gray">
                        <p>No jobs in this category.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MechanicJobsScreen;