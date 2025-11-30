import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { useNavigate } from 'react-router-dom';

interface NotificationToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const navigate = useNavigate();

    const typeConfig = {
        success: {
            border: 'border-green-500/50',
            bg: 'bg-green-500',
            title: 'text-green-300',
            glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
        },
        error: {
            border: 'border-red-500/50',
            bg: 'bg-red-500',
            title: 'text-red-400',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'
        },
        default: {
            border: 'border-primary/50',
            bg: 'bg-primary',
            title: 'text-primary',
            glow: 'shadow-glow'
        }
    };

    const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.default;


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(notification.id), 300);
        }, 5000);

        return () => clearTimeout(timer);
    }, [notification.id, onDismiss]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(notification.id), 300);
    };

    const handleClick = () => {
        if (notification.link) {
            navigate(notification.link);
        }
        handleClose();
    };

    const animationClass = isExiting ? 'animate-[slideOutRight_0.3s_ease-out_forwards]' : 'animate-slide-up';

    return (
        <div
            className={`w-80 max-w-full glass-card border ${config.border} ${config.glow} overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${animationClass}`}
            onClick={handleClick}
            role="alert"
        >
            <div className="p-4 flex items-start gap-3 relative z-10">
                <div className="flex-grow">
                    <p className={`font-bold ${config.title} text-sm drop-shadow-lg`}>{notification.title}</p>
                    <p className="text-sm text-light-gray mt-1 line-clamp-2">{notification.message}</p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className="text-gray-500 hover:text-white flex-shrink-0 text-xl leading-none transition-colors"
                >
                    &times;
                </button>
            </div>
            {/* Progress bar */}
            <div className={`absolute bottom-0 left-0 h-1 ${config.bg}/20 w-full`}>
                <div className={`h-full ${config.bg} animate-[progress_5s_linear_forwards] shadow-glow-sm`}></div>
            </div>
        </div>
    );
};

export default NotificationToast;
