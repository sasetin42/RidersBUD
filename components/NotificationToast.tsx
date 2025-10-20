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

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(notification.id), 300); // Wait for exit animation
        }, 5000); // 5 seconds

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

    const animationClass = isExiting ? 'animate-[slideOutRight_0.3s_ease-out_forwards]' : 'animate-[slideInRight_0.3s_ease-out_forwards]';

    return (
        <div 
            className={`w-80 max-w-full bg-dark-gray rounded-xl shadow-2xl border border-field overflow-hidden cursor-pointer ${animationClass}`}
            onClick={handleClick}
            role="alert"
        >
            <div className="p-4 flex items-start gap-3">
                <div className="flex-grow">
                    <p className="font-bold text-primary text-sm">{notification.title}</p>
                    <p className="text-sm text-light-gray mt-1 line-clamp-2">{notification.message}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="text-gray-500 hover:text-white flex-shrink-0">&times;</button>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-primary/50 w-full">
                <div className="h-full bg-primary animate-[progress_5s_linear_forwards]"></div>
            </div>
        </div>
    );
};

export default NotificationToast;