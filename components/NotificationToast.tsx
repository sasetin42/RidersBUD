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

    const onDismissRef = React.useRef(onDismiss);
    onDismissRef.current = onDismiss;

    const remainingTimeRef = React.useRef(3000);
    const lastTickRef = React.useRef<number | null>(null);
    const isExitingRef = React.useRef(false);

    const style = getTypeStyle(notification.type);
    const IconComponent = style.icon;

    const triggerDismiss = React.useCallback(() => {
        if (isExitingRef.current) return;
        isExitingRef.current = true;
        setIsExiting(true);
        setTimeout(() => {
            onDismissRef.current(notification.id);
        }, 280);
    }, [notification.id]);

    // Strict 3000ms auto-hide countdown with loading progress bar
    useEffect(() => {
        const intervalMs = 25;
        lastTickRef.current = Date.now();

        const timer = setInterval(() => {
            if (isExitingRef.current) return;

            const now = Date.now();
            const elapsed = now - (lastTickRef.current ?? now);
            lastTickRef.current = now;

            remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
            const currentPct = (remainingTimeRef.current / 3000) * 100;
            setProgress(currentPct);

            if (remainingTimeRef.current <= 0) {
                clearInterval(timer);
                triggerDismiss();
            }
        }, intervalMs);

        return () => {
            clearInterval(timer);
        };
    }, [triggerDismiss]);

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        triggerDismiss();
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
                borderRadius: '12px',
                background: 'rgba(18, 18, 22, 0.98)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderTop: `1px solid ${style.topBorder}`,
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.5)',
            }}
        >
            {/* Left color accent line */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[12px]"
                style={{
                    background: style.leftBar,
                    boxShadow: style.leftBarGlow,
                }}
            />

            {/* Compact content row */}
            <div className="flex items-center gap-2.5 pl-3 pr-2 py-2">
                {/* Compact icon badge */}
                <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                        background: style.iconBg,
                        border: `1px solid ${style.iconBorder}`,
                    }}
                >
                    <IconComponent
                        size={14}
                        strokeWidth={2.4}
                        style={{ color: style.iconColor } as React.CSSProperties}
                    />
                </div>

                {/* Text body - compact, highly legible */}
                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 leading-none">
                        <span
                            className="text-[7.5px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded leading-none flex-shrink-0"
                            style={{
                                background: style.badgeBg,
                                color: style.badgeText,
                                border: `1px solid ${style.badgeBorder}`,
                            }}
                        >
                            {style.badgeLabel}
                        </span>
                        <p
                            className="font-bold text-[12px] leading-tight truncate"
                            style={{ color: style.titleColor }}
                        >
                            {notification.title}
                        </p>
                    </div>
                    <p className="text-[11px] text-gray-200 mt-0.5 line-clamp-1 leading-snug font-normal">
                        {notification.message}
                    </p>
                </div>

                {/* Actions: View Link & Dismiss Button */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {notification.link && (
                        <button
                            className="flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded transition-opacity hover:opacity-80 active:scale-95"
                            style={{ color: style.linkColor }}
                            onClick={handleClick}
                        >
                            <span>View</span>
                            <ChevronRight size={10} strokeWidth={3} />
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors active:scale-90"
                        aria-label="Dismiss"
                    >
                        <X size={12} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Bottom 3-second countdown progress bar */}
            <div className="absolute bottom-0 left-[3px] right-0 h-[2px] bg-white/5">
                <div
                    className="h-full rounded-full transition-none"
                    style={{
                        width: `${progress}%`,
                        background: style.progressColor,
                        transition: 'width 25ms linear',
                        boxShadow: `0 0 6px ${style.progressColor}80`,
                    }}
                />
            </div>
        </div>
    );
};

export default NotificationToast;
