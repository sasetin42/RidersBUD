import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import { Bell, BellOff, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, AlertOctagon, Search, Users, Wrench, ChevronDown, ArrowUpDown } from 'lucide-react';

const typeConfig: Record<string, { icon: any; bg: string; text: string; }> = {
    success: { icon: CheckCircle, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    info: { icon: Info, bg: 'bg-blue-500/10', text: 'text-blue-400' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', text: 'text-amber-400' },
    alert: { icon: AlertOctagon, bg: 'bg-red-500/10', text: 'text-red-400' },
};

const formatDate = (d?: string | number) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AdminNotificationsScreen: React.FC = () => {
    const { db, clearAllNotificationsByPrefix, markAllNotificationsAsReadByPrefix } = useDatabase();
    const { addNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState<'customer-clear' | 'customer-mark' | 'mechanic-clear' | 'mechanic-mark' | null>(null);
    const [customerConfirm, setCustomerConfirm] = useState(false);
    const [mechanicConfirm, setMechanicConfirm] = useState(false);
    const [sortAsc, setSortAsc] = useState(false);

    const customerNotifications = useMemo(() => {
        if (!db?.notifications) return [];
        let filtered = db.notifications.filter(n => n.recipientId?.startsWith('customer-'));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
        }
        return filtered.sort((a, b) => sortAsc
            ? (a.timestamp ?? 0) - (b.timestamp ?? 0)
            : (b.timestamp ?? 0) - (a.timestamp ?? 0));
    }, [db?.notifications, searchQuery, sortAsc]);

    const mechanicNotifications = useMemo(() => {
        if (!db?.notifications) return [];
        let filtered = db.notifications.filter(n => n.recipientId?.startsWith('mechanic-'));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
        }
        return filtered.sort((a, b) => sortAsc
            ? (a.timestamp ?? 0) - (b.timestamp ?? 0)
            : (b.timestamp ?? 0) - (a.timestamp ?? 0));
    }, [db?.notifications, searchQuery, sortAsc]);

    const customerUnread = customerNotifications.filter(n => !n.read).length;
    const mechanicUnread = mechanicNotifications.filter(n => !n.read).length;

    const handleClearCustomers = async () => {
        if (!customerConfirm) { setCustomerConfirm(true); setTimeout(() => setCustomerConfirm(false), 3000); return; }
        setProcessing('customer-clear');
        try {
            await clearAllNotificationsByPrefix('customer-');
            addNotification({ type: 'success', title: 'Notifications Cleared', message: `All ${customerNotifications.length} customer notifications deleted.`, recipientId: 'admin' });
        } catch { }
        setProcessing(null);
        setCustomerConfirm(false);
    };

    const handleMarkCustomerRead = async () => {
        setProcessing('customer-mark');
        try {
            await markAllNotificationsAsReadByPrefix('customer-');
            addNotification({ type: 'success', title: 'Marked as Read', message: `All customer notifications marked as read.`, recipientId: 'admin' });
        } catch { }
        setProcessing(null);
    };

    const handleClearMechanics = async () => {
        if (!mechanicConfirm) { setMechanicConfirm(true); setTimeout(() => setMechanicConfirm(false), 3000); return; }
        setProcessing('mechanic-clear');
        try {
            await clearAllNotificationsByPrefix('mechanic-');
            addNotification({ type: 'success', title: 'Notifications Cleared', message: `All ${mechanicNotifications.length} mechanic notifications deleted.`, recipientId: 'admin' });
        } catch { }
        setProcessing(null);
        setMechanicConfirm(false);
    };

    const handleMarkMechanicRead = async () => {
        setProcessing('mechanic-mark');
        try {
            await markAllNotificationsAsReadByPrefix('mechanic-');
            addNotification({ type: 'success', title: 'Marked as Read', message: `All mechanic notifications marked as read.`, recipientId: 'admin' });
        } catch { }
        setProcessing(null);
    };

    if (!db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const renderNotificationTable = (
        notifications: typeof customerNotifications,
        unreadCount: number,
        type: 'customer' | 'mechanic'
    ) => (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white/5">
                    <tr>
                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-500">Status</th>
                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-500">Type</th>
                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-500">Title</th>
                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-500 hidden md:table-cell">Message</th>
                        <th className="px-4 py-4 text-[10px] font-black tracking-widest text-gray-500">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {notifications.length > 0 ? notifications.map(n => {
                        const config = typeConfig[n.type] || typeConfig.info;
                        const IconComponent = config.icon;
                        return (
                            <tr key={n.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${n.read ? 'text-gray-600 bg-white/5' : 'text-primary bg-primary/10'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${n.read ? 'bg-gray-600' : 'bg-primary animate-pulse'}`} />
                                        {n.read ? 'Read' : 'New'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${config.bg} ${config.text} border border-white/5`}>
                                        <IconComponent size={12} />
                                        {n.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-white">{n.title}</td>
                                <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell max-w-[300px] truncate">{n.message}</td>
                                <td className="px-4 py-3 text-[11px] text-gray-500 font-mono whitespace-nowrap">{formatDate(n.timestamp ?? n.date)}</td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={5} className="py-16 text-center">
                                <div className="flex flex-col items-center gap-3 text-gray-500">
                                    <BellOff size={32} />
                                    <p className="font-bold text-sm">No {type} notifications</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Notifications</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px]">Customer & Mechanic Alerts</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white font-medium placeholder-gray-600 outline-none transition-all focus:border-primary/50"
                        />
                    </div>
                    <button onClick={() => setSortAsc(!sortAsc)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all" title={sortAsc ? 'Newest first' : 'Oldest first'}>
                        <ArrowUpDown size={16} className={sortAsc ? 'rotate-180' : ''} />
                    </button>
                </div>
            </div>

            {/* Customer Notifications */}
            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Users size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Customer Notifications</h2>
                            <p className="text-sm text-gray-500 font-bold tracking-wide">{customerNotifications.length} total · {customerUnread} unread</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMarkCustomerRead}
                            disabled={processing === 'customer-mark' || customerUnread === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black tracking-widest border border-blue-500/20 transition-all disabled:opacity-30 active:scale-95"
                        >
                            {processing === 'customer-mark' ? <Spinner size="sm" color="text-blue-400" /> : <CheckCheck size={14} />}
                            Mark All Read
                        </button>
                        <button
                            onClick={handleClearCustomers}
                            disabled={processing === 'customer-clear' || customerNotifications.length === 0}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest border transition-all disabled:opacity-30 active:scale-95 ${
                                customerConfirm
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                                    : 'bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border-white/5 hover:border-red-500/20'
                            }`}
                        >
                            {processing === 'customer-clear' ? <Spinner size="sm" color="text-red-400" /> : <Trash2 size={14} />}
                            {customerConfirm ? 'Confirm Clear' : 'Clear All'}
                        </button>
                    </div>
                </div>
                {renderNotificationTable(customerNotifications, customerUnread, 'customer')}
            </div>

            {/* Mechanic Notifications */}
            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <Wrench size={22} className="text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Mechanic Notifications</h2>
                            <p className="text-sm text-gray-500 font-bold tracking-wide">{mechanicNotifications.length} total · {mechanicUnread} unread</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMarkMechanicRead}
                            disabled={processing === 'mechanic-mark' || mechanicUnread === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-[10px] font-black tracking-widest border border-orange-500/20 transition-all disabled:opacity-30 active:scale-95"
                        >
                            {processing === 'mechanic-mark' ? <Spinner size="sm" color="text-orange-400" /> : <CheckCheck size={14} />}
                            Mark All Read
                        </button>
                        <button
                            onClick={handleClearMechanics}
                            disabled={processing === 'mechanic-clear' || mechanicNotifications.length === 0}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest border transition-all disabled:opacity-30 active:scale-95 ${
                                mechanicConfirm
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                                    : 'bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border-white/5 hover:border-red-500/20'
                            }`}
                        >
                            {processing === 'mechanic-clear' ? <Spinner size="sm" color="text-red-400" /> : <Trash2 size={14} />}
                            {mechanicConfirm ? 'Confirm Clear' : 'Clear All'}
                        </button>
                    </div>
                </div>
                {renderNotificationTable(mechanicNotifications, mechanicUnread, 'mechanic')}
            </div>
        </div>
    );
};

export default AdminNotificationsScreen;
