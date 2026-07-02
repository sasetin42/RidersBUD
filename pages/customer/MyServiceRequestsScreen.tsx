import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Filter, Search, Calendar, MapPin, Activity, CheckCircle, Clock } from 'lucide-react';
import Spinner from '../../components/Spinner';

const MyServiceRequestsScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [filter, setFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
                <Spinner size="lg" />
            </div>
        );
    }

    const requests = db?.serviceRequests?.filter(req => req.customerId === user?.id) || [];
    
    const filteredRequests = requests.filter(req => {
        if (filter === 'All') return true;
        return req.status === filter;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
            case 'In Progress': return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
            case 'Cancelled': return 'text-red-500 border-red-500/20 bg-red-500/10';
            default: return 'text-blue-400 border-blue-400/20 bg-blue-400/10'; // Pending
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle size={14} className="shrink-0" />;
            case 'In Progress': return <Activity size={14} className="shrink-0" />;
            default: return <Clock size={14} className="shrink-0" />;
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans pb-24">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 border-b border-white/5 bg-[#111] sticky top-0 z-30">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/customer-portal')} className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black uppercase text-xl tracking-tight">Service Requests</h1>
                        <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">Track your specialized services</p>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                                filter === f 
                                ? 'bg-[#E62E00] border-[#E62E00] text-white' 
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* List */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-20 bg-[#111] border border-white/5">
                        <Activity size={32} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-white font-bold mb-1">No requests found</h3>
                        <p className="text-xs text-gray-500">You don't have any {filter !== 'All' ? filter.toLowerCase() : ''} service requests.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map(req => (
                            <div key={req.id} className="bg-[#111] border border-white/5 p-5 group hover:border-white/20 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-black uppercase text-white mb-1">{req.serviceName}</h3>
                                        <p className="text-[10px] text-gray-500 font-mono">ID: {req.id.slice(-8).toUpperCase()}</p>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                        {getStatusIcon(req.status)}
                                        {req.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {req.scheduledDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-500" />
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Scheduled</p>
                                                <p className="text-xs text-gray-300 font-medium">{new Date(req.scheduledDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    {req.vehicleId && (
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-gray-500" />
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Vehicle</p>
                                                <p className="text-xs text-gray-300 font-medium font-mono">{req.vehicleId}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Details Preview */}
                                {req.details && Object.keys(req.details).length > 0 && (
                                    <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-lg mt-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(req.details).slice(0, 4).map(([key, value]) => {
                                                // Avoid showing giant text blocks or instructions in the preview
                                                if (key === 'instructions' || key === 'damageDesc') return null;
                                                return (
                                                    <div key={key}>
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">{key}</p>
                                                        <p className="text-xs text-gray-300 font-medium truncate">{String(value)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MyServiceRequestsScreen;
