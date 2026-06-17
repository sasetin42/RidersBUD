import React, { useState, useEffect, useMemo } from 'react';
import { db as firestoreDB } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import Spinner from '../../components/Spinner';
import { Star, Users, MessageSquare, Search, Trash2, Calendar, Smile, Award, Clock, Filter, AlertCircle, Heart } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import { useNotification } from '../../context/NotificationContext';

interface SatisfactionFeedback {
    feedbackId: string;
    userId: string;
    userName: string;
    userType: 'customer' | 'mechanic';
    userEmail?: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    chatSessionId: string;
    chatStartedAt?: any;
    chatCompletedAt?: any;
    submittedAt?: any;
}

const AdminSatisfactionScreen: React.FC = () => {
    const [feedbackList, setFeedbackList] = useState<SatisfactionFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'customer' | 'mechanic'>('all');
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
    const { addNotification } = useNotification();

    // Listen to real-time reviews from Firestore
    useEffect(() => {
        const feedbackRef = collection(firestoreDB, 'support_satisfaction');
        const q = query(feedbackRef, orderBy('submittedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                feedbackId: doc.id,
                ...doc.data()
            } as SatisfactionFeedback));
            setFeedbackList(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching satisfaction reviews:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Summary Statistics
    const stats = useMemo(() => {
        const total = feedbackList.length;
        if (total === 0) {
            return {
                average: 0,
                total,
                customerCount: 0,
                mechanicCount: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const sum = feedbackList.reduce((acc, curr) => acc + curr.rating, 0);
        const average = sum / total;

        const customerCount = feedbackList.filter(f => f.userType === 'customer').length;
        const mechanicCount = feedbackList.filter(f => f.userType === 'mechanic').length;

        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        feedbackList.forEach(f => {
            const r = f.rating as 1 | 2 | 3 | 4 | 5;
            if (dist[r] !== undefined) {
                dist[r]++;
            }
        });

        return {
            average,
            total,
            customerCount,
            mechanicCount,
            distribution: dist
        };
    }, [feedbackList]);

    // Delete feedback record
    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this satisfaction review record?")) return;
        try {
            await deleteDoc(doc(firestoreDB, 'support_satisfaction', id));
            addNotification({
                type: 'success',
                title: 'Review Deleted',
                message: 'Satisfaction review record was deleted successfully.',
                recipientId: 'admin',
            });
        } catch (error) {
            console.error("Error deleting feedback record:", error);
            addNotification({
                type: 'error',
                title: 'Deletion Failed',
                message: 'Failed to delete the feedback record. Please try again.',
                recipientId: 'admin',
            });
        }
    };

    // Filtered reviews
    const filteredFeedback = useMemo(() => {
        return feedbackList.filter(item => {
            const matchesSearch = 
                (item.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.comment || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesUserType = userTypeFilter === 'all' || item.userType === userTypeFilter;
            const matchesRating = ratingFilter === 'all' || item.rating === ratingFilter;

            return matchesSearch && matchesUserType && matchesRating;
        });
    }, [feedbackList, searchQuery, userTypeFilter, ratingFilter]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner size="lg" color="text-white" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4">
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Support Satisfaction</h1>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl">
                        <Smile className="w-4 h-4 text-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Customer Trust Monitor</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <div className="h-1 w-12 bg-primary rounded-full"></div>
                    <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px]">Realtime User Experience Ratings</p>
                </div>
            </div>

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Average Satisfaction Card */}
                <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Average Trust Score</span>
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Award className="w-5 h-5" />
                            </div>
                        </div>
                        <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-3">
                            {stats.average > 0 ? stats.average.toFixed(2) : '0.00'}
                        </h2>
                        <div className="flex items-center gap-1.5 mb-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-5 h-5 ${s <= Math.round(stats.average) ? 'text-primary fill-primary filter drop-shadow-[0_0_6px_rgba(255,107,0,0.4)]' : 'text-gray-700'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-6 leading-relaxed">
                        Score computed from all submitted user ratings. More stars signify stronger brand loyalty and support accuracy.
                    </p>
                </div>

                {/* Submissions Breakdown Card */}
                <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Submissions</span>
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                        </div>
                        <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-4">
                            {stats.total}
                        </h2>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 flex items-center gap-1.5"><Users size={12} className="text-green-500" /> Customers</span>
                                <span className="font-bold text-white">{stats.customerCount} reviews</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 flex items-center gap-1.5"><Award size={12} className="text-blue-400" /> Mechanics</span>
                                <span className="font-bold text-white">{stats.mechanicCount} reviews</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-6 leading-relaxed">
                        Real-time reviews logged automatically by customers and bike repair mechanics upon session resolution.
                    </p>
                </div>

                {/* Rating Distribution Card */}
                <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Satisfaction Spread</span>
                            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                <Heart className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            {[5, 4, 3, 2, 1].map((rValue) => {
                                const count = stats.distribution[rValue as 1|2|3|4|5] || 0;
                                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={rValue} className="flex items-center gap-2 text-xs">
                                        <span className="w-10 text-gray-400 font-bold shrink-0">{rValue} Stars</span>
                                        <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="w-12 text-right text-gray-500 shrink-0">{count} ({Math.round(percentage)}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Feed Section */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col space-y-8">
                {/* Search & Filters */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                        <Filter className="text-primary" />
                        Ratings Feed
                    </h3>
                    <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, or comment..."
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            />
                        </div>

                        {/* Filter by User Type */}
                        <div className="flex bg-[#1E1E1E] p-1.5 rounded-xl border border-white/5 text-xs">
                            <button
                                onClick={() => setUserTypeFilter('all')}
                                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all ${userTypeFilter === 'all' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                All Users
                            </button>
                            <button
                                onClick={() => setUserTypeFilter('customer')}
                                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all ${userTypeFilter === 'customer' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Customers
                            </button>
                            <button
                                onClick={() => setUserTypeFilter('mechanic')}
                                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all ${userTypeFilter === 'mechanic' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Mechanics
                            </button>
                        </div>

                        {/* Filter by Star Level */}
                        <div className="relative">
                            <select
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                className="appearance-none bg-[#1E1E1E] text-gray-300 border border-white/10 rounded-xl px-4 pr-10 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                            >
                                <option value="all">ALL RATINGS</option>
                                <option value="5">5 STARS</option>
                                <option value="4">4 STARS</option>
                                <option value="3">3 STARS</option>
                                <option value="2">2 STARS</option>
                                <option value="1">1 STAR</option>
                            </select>
                            <Star className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>

                {/* Reviews List Feed */}
                <div className="space-y-4">
                    {filteredFeedback.length > 0 ? (
                        filteredFeedback.map((review) => (
                            <div
                                key={review.feedbackId}
                                className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group relative overflow-hidden"
                            >
                                <div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* User Avatar */}
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-gray-800">
                                            <img
                                                src={review.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=random`}
                                                alt={review.userName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=FE7803&color=fff`; }}
                                            />
                                        </div>
                                    </div>

                                    {/* User Info */}
                                    <div className="text-left min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-white text-base truncate">{review.userName}</h4>
                                            <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest ${review.userType === 'mechanic' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {review.userType}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{review.userEmail || 'No Email'}</p>
                                        
                                        {/* Stars and comment */}
                                        <div className="flex items-center gap-1 mt-2">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-primary fill-primary' : 'text-gray-700'}`}
                                                />
                                            ))}
                                            <span className="text-[10px] text-gray-600 font-bold ml-1 uppercase">
                                                {review.rating} out of 5
                                            </span>
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-gray-300 leading-relaxed mt-3 bg-black/20 p-3.5 border border-white/[0.03] rounded-xl whitespace-pre-wrap">
                                                {review.comment}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions & Timestamp */}
                                <div className="flex md:flex-col items-end gap-3 self-stretch justify-between md:justify-center shrink-0">
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase flex items-center gap-1 justify-end">
                                            <Calendar size={10} />
                                            {formatTimestamp(review.submittedAt)}
                                        </p>
                                    </div>

                                    <Tooltip content="Delete Review Record" position="left">
                                        <button
                                            onClick={() => handleDeleteFeedback(review.feedbackId)}
                                            className="p-2.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 flex flex-col items-center gap-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} className="text-gray-700 animate-bounce" />
                            </div>
                            <p className="text-gray-500 text-sm font-medium">No reviews match the selected filter query.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSatisfactionScreen;
