import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { getProfileImage } from '../utils/imageConstants';
import {
    Bell, X, Check, CheckCheck, Trash2,
    Info, AlertTriangle, CheckCircle, AlertOctagon,
    Clock, ChevronRight, BellOff, Sparkles, User
} from 'lucide-react';

type FilterTab = 'all' | 'unread';

const typeConfig = {
    success: {
        icon: CheckCircle,
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/25',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
        dot: 'bg-emerald-400',
        label: 'Success',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
        leftBar: 'bg-emerald-500',
        leftBarGlow: 'shadow-[0_0_8px_rgba(16,185,129,0.8)]',
        unreadBg: 'bg-emerald-500/[0.03]',
        hoverBg: 'hover:bg-emerald-500/[0.05]',
        glowColor: 'rgba(16,185,129,0.5)',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/25',
        text: 'text-blue-400',
        glow: 'shadow-blue-500/20',
        dot: 'bg-blue-400',
        label: 'Info',
        badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
        leftBar: 'bg-blue-500',
        leftBarGlow: 'shadow-[0_0_8px_rgba(59,130,246,0.8)]',
        unreadBg: 'bg-blue-500/[0.03]',
        hoverBg: 'hover:bg-blue-500/[0.05]',
        glowColor: 'rgba(59,130,246,0.5)',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
        dot: 'bg-amber-400',
        label: 'Warning',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
        leftBar: 'bg-amber-500',
        leftBarGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.8)]',
        unreadBg: 'bg-amber-500/[0.03]',
        hoverBg: 'hover:bg-amber-500/[0.05]',
        glowColor: 'rgba(245,158,11,0.5)',
    },
    alert: {
        icon: AlertOctagon,
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        text: 'text-red-400',
        glow: 'shadow-red-500/20',
        dot: 'bg-red-400',
        label: 'Alert',
        badge: 'bg-red-500/15 text-red-300 border-red-500/25',
        leftBar: 'bg-red-500',
        leftBarGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',
        unreadBg: 'bg-red-500/[0.03]',
        hoverBg: 'hover:bg-red-500/[0.05]',
        glowColor: 'rgba(239,68,68,0.5)',
    },
} as const;


const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown time';
    const diff = Date.now() - timestamp;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAbsoluteTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
};

interface NotificationCardProps {
    notif: Notification;
    onMarkRead: (id: string) => void;
    onDelete: (id: string) => void;
    onNavigate: (notif: Notification) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notif, onMarkRead, onDelete, onNavigate }) => {
    const config = typeConfig[notif.type] || typeConfig.info;
    const IconComponent = config.icon;
    const [showAbsTime, setShowAbsTime] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [imgError, setImgError] = useState(false);

    const { db } = useDatabase();

    const mechanicId = notif.metadata?.mechanicId;
    const mechanic = db?.mechanics?.find(m => 
        (mechanicId && m.id === mechanicId) || 
        (notif.message && m.name && notif.message.toLowerCase().includes(m.name.toLowerCase())) ||
        (notif.title && m.name && notif.title.toLowerCase().includes(m.name.toLowerCase()))
    );

    const showMechanicImg = !!mechanic;
    const mechanicImgUrl = mechanic ? getProfileImage(mechanic.imageUrl, 'mechanic') : '';

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleting(true);
        setTimeout(() => {
            setIsVisible(false);
            onDelete(notif.id);
        }, 300);
    };

    const handleMarkRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkRead(notif.id);
    };

    const handleView = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNavigate(notif);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`relative group border-b border-white/[0.05] transition-all duration-300 ${
                isDeleting ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'
            } ${
                !notif.read ? config.unreadBg : 'bg-[#111111]'
            } ${notif.link ? `cursor-pointer ${config.hoverBg}` : 'hover:bg-[#1a1a1a]'}`}
            onClick={notif.link ? handleView : undefined}
        >
            {/* Color-coded left accent bar with glow */}
            {!notif.read && (
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${config.leftBar} ${config.leftBarGlow}`} />
            )}

            <div className="p-2 sm:p-3 pl-3 sm:pl-4">
                <div className="flex items-start gap-2.5 sm:gap-3.5">
                    {/* Icon or Mechanic Image with color-coded container */}
                    <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${config.bg} ${config.border} shadow-lg ${config.glow} mt-0.5`}>
                        {showMechanicImg && mechanicImgUrl && !imgError ? (
                            <img
                                src={mechanicImgUrl}
                                alt={mechanic?.name || 'Mechanic'}
                                onError={() => setImgError(true)}
                                className="w-full h-full object-cover"
                            />
                        ) : showMechanicImg ? (
                            <User size={14} className={config.text} strokeWidth={2.5} />
                        ) : (
                            <IconComponent size={14} className={config.text} strokeWidth={2.5} />
                        )}
                        {/* Animated pulse dot for unread */}
                        {!notif.read && (
                            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${config.dot} border-2 border-[#111] shadow-sm`} />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {/* Type badge */}
                                <span className={`text-[7px] font-black tracking-widest uppercase px-1 py-0.5 rounded border ${config.badge} shrink-0`}>
                                    {config.label}
                                </span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                                {!notif.read && (
                                    <button
                                        onClick={handleMarkRead}
                                        title="Mark as read"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#FE7803]/20 text-[#FE7803] transition-colors active:scale-90"
                                    >
                                        <Check size={12} strokeWidth={3} />
                                    </button>
                                )}
                                <button
                                    onClick={handleDelete}
                                    title="Delete notification"
                                    disabled={isDeleting}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors active:scale-90 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <svg className="animate-spin h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    ) : (
                                        <Trash2 size={12} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Title */}
                        <h4 className={`text-[12px] sm:text-[13px] font-bold leading-snug break-words ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                            {notif.title}
                        </h4>

                        {/* Message */}
                        <p className="text-[11px] sm:text-[12px] text-gray-500 mt-0.5 leading-relaxed break-words line-clamp-2">
                            {notif.message}
                        </p>

                        <div className="flex items-center justify-between mt-1">
                            <button
                                className={`flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 transition-colors py-0.5`}
                                onMouseEnter={() => setShowAbsTime(true)}
                                onMouseLeave={() => setShowAbsTime(false)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Clock size={9} />
                                <span className="font-mono tracking-wide">
                                    {showAbsTime ? formatAbsoluteTime(notif.timestamp) : formatRelativeTime(notif.timestamp)}
                                </span>
                            </button>

                            {notif.link && (
                                <button
                                    onClick={handleView}
                                    className={`flex items-center gap-0.5 text-[9px] font-black tracking-wide transition-colors py-0.5 group/view ${config.text} hover:opacity-80`}
                                >
                                    View
                                    <ChevronRight size={9} strokeWidth={3} className="group-hover/view:translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const NotificationBell: React.FC<{ className?: string }> = ({ className = "" }) => {
    const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotification();
    const { mechanic } = useMechanicAuth();
    const { user: customer } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [isClearing, setIsClearing] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isAdmin = localStorage.getItem('ridersbud_admin_session') === 'true';

    // Determine current user recipient ID for actions (clear/mark all)
    const recipientId = isAdmin
        ? 'admin'
        : mechanic
        ? `mechanic-${mechanic.id}`
        : customer
        ? `customer-${customer.id}`
        : null;

    // Notifications are already filtered by role in NotificationContext
    const unreadCount = notifications.filter(n => n.status === 'unread' || n.read === false).length;
    const displayNotifications = activeTab === 'unread'
        ? notifications.filter(n => n.status === 'unread' || n.read === false)
        : notifications;

    // Close on outside click disabled per user request to only close via close button
    useEffect(() => {
        // Outside click close disabled
    }, []);

    // Disable background scroll when open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            const originalHeight = document.body.style.height;
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.height = originalHeight;
            };
        }
    }, [isOpen]);

    const handleMarkAllAsRead = useCallback(() => {
        if (recipientId) markAllAsRead(recipientId);
    }, [recipientId, markAllAsRead]);

    const handleClearAll = useCallback(async () => {
        if (!recipientId || isClearing) return;
        setIsClearing(true);
        try {
            await clearAllNotifications(recipientId);
        } finally {
            // Brief delay so the spinner is visible — UI has already cleared optimistically
            setTimeout(() => setIsClearing(false), 600);
        }
    }, [recipientId, clearAllNotifications, isClearing]);

    const handleNotificationNavigate = useCallback((notif: Notification) => {
        markAsRead(notif.id);
        if (notif.link) {
            let targetLink = notif.link;
            
            // 1. Correct history link
            if (targetLink === '/customer-portal/history' || targetLink === '/booking-history') {
                targetLink = '/customer-portal/booking-history';
            }
            // 2. Correct booking detail page mapping
            else if (targetLink.startsWith('/customer-portal/booking/') && !targetLink.startsWith('/customer-portal/booking-detail/') && !targetLink.includes('history')) {
                const parts = targetLink.split('/');
                const bookingId = parts[parts.length - 1];
                if (bookingId && (bookingId.startsWith('booking_') || bookingId.length > 5)) {
                    targetLink = `/customer-portal/booking-detail/${bookingId}`;
                }
            }
            // 3. Correct legacy relative links
            else if (targetLink === '/services') {
                targetLink = '/customer-portal/services';
            }
            else if (targetLink === '/parts-store') {
                targetLink = '/customer-portal/parts-store';
            }
            else if (targetLink === '/reminders') {
                targetLink = '/customer-portal/reminders';
            }
            // 4. Correct legacy mechanic job links
            else if (targetLink.startsWith('/mechanic/job/')) {
                targetLink = targetLink.replace('/mechanic/job/', '/mechanic-portal/job/');
            }

            navigate(targetLink);
        }
        setIsOpen(false);
    }, [markAsRead, navigate]);

    const renderPanelContent = () => (
        <>
            {/* ── Mobile Header (compact) ── */}
            <div className="flex-shrink-0 px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-4 border-b border-[#FE7803]/20 bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FE7803]/10 border border-[#FE7803]/20 flex items-center justify-center">
                            <Bell size={13} className="text-[#FE7803]" />
                        </div>
                        <div>
                            <h3 className="text-[13px] sm:text-sm font-black text-white tracking-wide leading-tight">Notifications</h3>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold tracking-widest leading-tight">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#FE7803]/10 hover:bg-[#FE7803]/20 text-[#FE7803] text-[9px] sm:text-[10px] font-black tracking-wide border border-[#FE7803]/20 transition-all active:scale-90"
                            >
                                <CheckCheck size={11} strokeWidth={3} />
                                <span className="hidden xs:inline">Mark read</span>
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                disabled={isClearing}
                                className={`flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black tracking-wide border transition-all active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed ${
                                    isClearing
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : 'bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border-white/5 hover:border-red-500/20'
                                }`}
                                title="Clear all notifications"
                            >
                                {isClearing ? (
                                    <svg className="animate-spin h-2.5 w-2.5 text-red-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                ) : (
                                    <Trash2 size={11} />
                                )}
                                {isClearing ? 'Clearing...' : 'Clear'}
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors active:bg-white/10"
                        >
                            <X size={14} className="sm:size-[16px]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Tabs (compact) ── */}
            <div className="flex-shrink-0 flex border-b border-white/10 bg-[#131313] px-3 sm:px-5 pt-2 sm:pt-3 pb-0 gap-3 sm:gap-4">
                {(['all', 'unread'] as FilterTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-2 sm:pb-3 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-colors ${
                            activeTab === tab ? 'text-[#FE7803]' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                        {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FE7803] rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── Notification List ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-[#111111]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                {displayNotifications.length > 0 ? (
                    displayNotifications.map(notif => (
                        <NotificationCard
                            key={notif.id}
                            notif={notif}
                            onMarkRead={markAsRead}
                            onDelete={deleteNotification}
                            onNavigate={handleNotificationNavigate}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3 sm:mb-4">
                            {activeTab === 'unread' ? (
                                <CheckCheck size={20} className="text-gray-600" />
                            ) : (
                                <BellOff size={20} className="text-gray-600" />
                            )}
                        </div>
                        <p className="text-sm font-bold text-gray-500 mb-1">
                            {activeTab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
                        </p>
                        <p className="text-[11px] text-gray-600">
                            {activeTab === 'unread'
                                ? 'No unread notifications at this time.'
                                : "We'll notify you when something important happens."}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Footer (compact, safe-area aware) ── */}
            {notifications.length > 0 && (
                <div className="flex-shrink-0 px-3 sm:px-5 py-2 sm:py-3 border-t border-white/10 bg-[#1a1a1a] flex items-center justify-center sm:justify-between" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-[#FE7803]" />
                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold tracking-wide">
                            {notifications.length} total · {unreadCount} unread
                        </span>
                    </div>
                    <span className="hidden sm:inline text-[10px] text-gray-500">Tap icons to act</span>
                </div>
            )}
        </>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => { setIsOpen(prev => !prev); setClearConfirm(false); }}
                className={`relative transition-all duration-200 flex items-center justify-center ${
                    className || 'p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5'
                } ${
                    isOpen
                        ? 'bg-[#FE7803]/15 text-[#FE7803]'
                        : ''
                }`}
                aria-label="Notifications"
            >
                <Bell className={`h-5 w-5 transition-transform duration-300 ${unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-[18px] w-[18px] translate-x-1/3 -translate-y-1/3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FE7803] opacity-60" />
                        <span className="relative inline-flex rounded-full h-[18px] w-[18px] bg-[#FE7803] text-[9px] font-black text-white items-center justify-center border-2 border-[#121212] shadow-lg">
                            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Mobile layout: beautifully centered, highly readable responsive modal rendered via React Portal */}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] sm:hidden flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/85 backdrop-blur-md"
                    />
                    <div
                        className="relative w-[92vw] max-w-[380px] max-h-[75vh] bg-[#111111] border-2 border-[#FE7803]/40 rounded-3xl z-10 flex flex-col overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-scaleUp origin-center"
                        onClick={e => e.stopPropagation()}
                    >
                        {renderPanelContent()}
                    </div>
                </div>,
                document.body
            )}

            {/* Desktop layout: absolute dropdown aligned to bell */}
            {isOpen && (
                <div
                    className="hidden sm:flex absolute right-0 top-full mt-3 w-[420px] max-h-[640px] bg-[#111111] border-2 border-[#FE7803]/25 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.9)] z-50 flex-col overflow-hidden"
                    style={{ animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {renderPanelContent()}
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    15% { transform: rotate(-10deg); }
                    30% { transform: rotate(8deg); }
                    45% { transform: rotate(-6deg); }
                    60% { transform: rotate(4deg); }
                    75% { transform: rotate(-2deg); }
                }
                .animate-scaleUp {
                    animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;
