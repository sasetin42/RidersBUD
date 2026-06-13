import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    Info,
    AlertTriangle,
    AlertOctagon,
    X,
    ChevronRight,
    Briefcase,
} from 'lucide-react';

interface NotificationToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
}

type NotifType = 'success' | 'info' | 'warning' | 'alert' | 'job';

interface TypeStyle {
    icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
    iconColor: string;
    iconBg: string;
    iconBorder: string;
    leftBar: string;
    leftBarGlow: string;
    topBorder: string;
    titleColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    badgeLabel: string;
    progressColor: string;
    linkColor: string;
}

const TYPE_STYLES: Record<NotifType, TypeStyle> = {
    success: {
        icon: CheckCircle,
        iconColor: '#10B981',
        iconBg: 'rgba(16,185,129,0.12)',
        iconBorder: 'rgba(16,185,129,0.30)',
        leftBar: '#10B981',
        leftBarGlow: '0 0 10px rgba(16,185,129,0.7)',
        topBorder: 'rgba(16,185,129,0.20)',
        titleColor: '#ECFDF5',
        badgeBg: 'rgba(16,185,129,0.12)',
        badgeText: '#6EE7B7',
        badgeBorder: 'rgba(16,185,129,0.30)',
        badgeLabel: 'SUCCESS',
        progressColor: '#10B981',
        linkColor: '#34D399',
    },
    info: {
        icon: Info,
        iconColor: '#3B82F6',
        iconBg: 'rgba(59,130,246,0.12)',
        iconBorder: 'rgba(59,130,246,0.30)',
        leftBar: '#3B82F6',
        leftBarGlow: '0 0 10px rgba(59,130,246,0.7)',
        topBorder: 'rgba(59,130,246,0.20)',
        titleColor: '#EFF6FF',
        badgeBg: 'rgba(59,130,246,0.12)',
        badgeText: '#93C5FD',
        badgeBorder: 'rgba(59,130,246,0.30)',
        badgeLabel: 'INFO',
        progressColor: '#3B82F6',
        linkColor: '#60A5FA',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: '#F59E0B',
        iconBg: 'rgba(245,158,11,0.12)',
        iconBorder: 'rgba(245,158,11,0.30)',
        leftBar: '#F59E0B',
        leftBarGlow: '0 0 10px rgba(245,158,11,0.7)',
        topBorder: 'rgba(245,158,11,0.20)',
        titleColor: '#FFFBEB',
        badgeBg: 'rgba(245,158,11,0.12)',
        badgeText: '#FCD34D',
        badgeBorder: 'rgba(245,158,11,0.30)',
        badgeLabel: 'WARNING',
        progressColor: '#F59E0B',
        linkColor: '#FBBF24',
    },
    alert: {
        icon: AlertOctagon,
        iconColor: '#EF4444',
        iconBg: 'rgba(239,68,68,0.12)',
        iconBorder: 'rgba(239,68,68,0.30)',
        leftBar: '#EF4444',
        leftBarGlow: '0 0 10px rgba(239,68,68,0.7)',
        topBorder: 'rgba(239,68,68,0.20)',
        titleColor: '#FEF2F2',
        badgeBg: 'rgba(239,68,68,0.12)',
        badgeText: '#FCA5A5',
        badgeBorder: 'rgba(239,68,68,0.30)',
        badgeLabel: 'ALERT',
        progressColor: '#EF4444',
        linkColor: '#F87171',
    },
    job: {
        icon: Briefcase,
        iconColor: '#FE7803',
        iconBg: 'rgba(254,120,3,0.12)',
        iconBorder: 'rgba(254,120,3,0.30)',
        leftBar: '#FE7803',
        leftBarGlow: '0 0 10px rgba(254,120,3,0.8)',
        topBorder: 'rgba(254,120,3,0.25)',
        titleColor: '#FFF7ED',
        badgeBg: 'rgba(254,120,3,0.12)',
        badgeText: '#FE7803',
        badgeBorder: 'rgba(254,120,3,0.35)',
        badgeLabel: 'NEW JOB',
        progressColor: '#FE7803',
        linkColor: '#FE7803',
    },
};

const getTypeStyle = (type: string): TypeStyle => {
    if (type in TYPE_STYLES) return TYPE_STYLES[type as NotifType];
    // Heuristic: job-related titles use orange
    return TYPE_STYLES.info;
};

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const navigate = useNavigate();

    const style = getTypeStyle(notification.type);
    const IconComponent = style.icon;

    // Auto-dismiss timer + progress bar
    useEffect(() => {
        const duration = 5000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const progressTimer = setInterval(() => {
            setProgress(prev => Math.max(0, prev - step));
        }, interval);

        const dismissTimer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(notification.id), 320);
        }, duration);

        return () => {
            clearInterval(progressTimer);
            clearTimeout(dismissTimer);
        };
    }, [notification.id, onDismiss]);

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsExiting(true);
        setTimeout(() => onDismiss(notification.id), 320);
    };

    const handleClick = () => {
        if (notification.link) navigate(notification.link);
        handleClose();
    };

    const animClass = isExiting
        ? 'animate-toast-out'
        : 'animate-toast-in';

    return (
        <div
            className={`relative w-full overflow-hidden cursor-pointer select-none ${animClass}`}
            onClick={handleClick}
            role="alert"
            aria-live="assertive"
            style={{
                borderRadius: '18px',
                background: 'rgba(22,22,26,0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: `1px solid ${style.topBorder}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
            }}
        >
            {/* Left color accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[18px]"
                style={{
                    background: style.leftBar,
                    boxShadow: style.leftBarGlow,
                }}
            />

            {/* Content */}
            <div className="flex items-start gap-3 pl-4 pr-3 pt-3 pb-2.5">
                {/* Icon */}
                <div
                    className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center mt-0.5"
                    style={{
                        background: style.iconBg,
                        border: `1px solid ${style.iconBorder}`,
                    }}
                >
                    <IconComponent
                        size={18}
                        strokeWidth={2.2}
                        className=""
                        style={{ color: style.iconColor } as React.CSSProperties}
                    />
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                    {/* Type badge + title row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                            className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md"
                            style={{
                                background: style.badgeBg,
                                color: style.badgeText,
                                border: `1px solid ${style.badgeBorder}`,
                            }}
                        >
                            {style.badgeLabel}
                        </span>
                    </div>
                    <p
                        className="font-black text-[13px] leading-snug line-clamp-1"
                        style={{ color: style.titleColor }}
                    >
                        {notification.title}
                    </p>
                    <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                    </p>

                    {/* View link */}
                    {notification.link && (
                        <div className="flex justify-end mt-1.5">
                            <button
                                className="flex items-center gap-0.5 text-[10px] font-black tracking-wide transition-opacity hover:opacity-70"
                                style={{ color: style.linkColor }}
                                onClick={handleClick}
                            >
                                View
                                <ChevronRight size={10} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Close button — 44px touch target */}
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 -mt-0.5 -mr-0.5 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors active:scale-90"
                    aria-label="Dismiss"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-[4px] right-0 h-[2px] bg-white/5">
                <div
                    className="h-full rounded-full transition-none"
                    style={{
                        width: `${progress}%`,
                        background: style.progressColor,
                        transition: 'width 50ms linear',
                        boxShadow: `0 0 6px ${style.progressColor}80`,
                    }}
                />
            </div>
        </div>
    );
};

export default NotificationToast;
