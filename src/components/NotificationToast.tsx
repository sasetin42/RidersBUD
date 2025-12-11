import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    AlertCircle,
    Calendar,
    Package,
    Bell,
    MessageSquare,
    Briefcase,
    Info,
    X,
    ExternalLink
} from 'lucide-react';

interface NotificationToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const navigate = useNavigate();

    // Configuration for different notification types
    const typeConfig: Record<string, {
        icon: React.ElementType,
        color: string,
        bgColor: string,
        borderColor: string,
        shadowColor: string,
        gradient: string
    }> = {
        success: {
            icon: CheckCircle2,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
            shadowColor: 'shadow-green-500/10',
            gradient: 'from-green-500 to-emerald-600'
        },
        error: {
            icon: AlertCircle,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
            shadowColor: 'shadow-red-500/10',
            gradient: 'from-red-500 to-rose-600'
        },
        booking: {
            icon: Calendar,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            shadowColor: 'shadow-orange-500/10',
            gradient: 'from-orange-500 to-amber-600'
        },
        order: {
            icon: Package,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            shadowColor: 'shadow-blue-500/10',
            gradient: 'from-blue-500 to-indigo-600'
        },
        reminder: {
            icon: Bell,
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20',
            shadowColor: 'shadow-yellow-500/10',
            gradient: 'from-yellow-400 to-orange-500'
        },
        chat: {
            icon: MessageSquare,
            color: 'text-sky-400',
            bgColor: 'bg-sky-500/10',
            borderColor: 'border-sky-500/20',
            shadowColor: 'shadow-sky-500/10',
            gradient: 'from-sky-500 to-cyan-600'
        },
        job: {
            icon: Briefcase,
            color: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10',
            borderColor: 'border-indigo-500/20',
            shadowColor: 'shadow-indigo-500/10',
            gradient: 'from-indigo-500 to-violet-600'
        },
        general: {
            icon: Info,
            color: 'text-white',
            bgColor: 'bg-white/5',
            borderColor: 'border-white/10',
            shadowColor: 'shadow-white/5',
            gradient: 'from-gray-400 to-gray-600'
        }
    };

    const config = typeConfig[notification.type] || typeConfig.general;
    const Icon = config.icon;

    useEffect(() => {
        if (isHovered) return; // Pause timer on hover

        const timer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [notification.id, onDismiss, isHovered]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(notification.id), 400); // Wait for animation
    };

    const handleClick = () => {
        if (notification.link) {
            navigate(notification.link);
        }
        handleClose();
    };

    return (
        <div
            className={`
                relative w-96 max-w-[calc(100vw-40px)] 
                backdrop-blur-xl bg-[#121212]/90 
                rounded-2xl border ${config.borderColor} 
                shadow-2xl ${config.shadowColor}
                overflow-hidden cursor-pointer group
                transform transition-all duration-300 ease-out
                ${isExiting ? 'animate-[slideOutRight_0.4s_ease-in_forwards] translate-x-10 opacity-0' : 'animate-[slideInRight_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] translate-x-0 opacity-100'}
                hover:scale-[1.02] hover:-translate-y-1
            `}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="alert"
        >
            {/* Top Gradient Line */}
            <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${config.gradient} opacity-70`}></div>

            {/* Glowing Background Blob */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${config.bgColor} rounded-full blur-[50px] opacity-40 group-hover:opacity-60 transition-opacity duration-500`}></div>

            <div className="relative p-5 flex items-start gap-4">

                {/* Icon Container */}
                <div className={`
                    flex-shrink-0 w-10 h-10 rounded-full 
                    ${config.bgColor} border ${config.borderColor} 
                    flex items-center justify-center 
                    shadow-lg
                `}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={`font-bold text-sm ${config.color} tracking-wide`}>
                            {notification.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                        {notification.message}
                    </p>

                    {notification.link && (
                        <div className="mt-3 flex items-center text-xs text-gray-400 group-hover:text-white transition-colors gap-1.5 font-medium">
                            <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/20 transition-all flex items-center gap-1">
                                View Details <ExternalLink size={10} />
                            </span>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className="flex-shrink-0 text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress Bar */}
            {!isHovered && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-800">
                    <div className={`h-full bg-gradient-to-r ${config.gradient} animate-[progress_5s_linear_forwards] origin-left`}></div>
                </div>
            )}
        </div>
    );
};

export default NotificationToast;
