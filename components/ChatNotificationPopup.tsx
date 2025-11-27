import React, { useEffect, useState } from 'react';

interface ChatNotificationPopupProps {
    senderName: string;
    senderAvatar: string;
    message: string;
    onClose: () => void;
}

const ChatNotificationPopup: React.FC<ChatNotificationPopupProps> = ({ senderName, senderAvatar, message, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300); // Wait for exit animation
        }, 5000); // 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    // These custom animations are defined in index.html inside the tailwind.config
    const animationClass = isExiting ? 'animate-[slideOutRight_0.3s_ease-out_forwards]' : 'animate-[slideInRight_0.3s_ease-out_forwards]';

    return (
        <div 
            className={`fixed top-5 right-5 w-80 max-w-[calc(100%-2.5rem)] bg-dark-gray rounded-xl shadow-2xl border border-field overflow-hidden z-[100] ${animationClass}`}
            onClick={handleClose}
            role="alert"
        >
            <div className="p-4 flex items-start gap-3">
                <img src={senderAvatar} alt={senderName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                <div className="flex-grow">
                    <p className="font-bold text-white text-sm">{senderName}</p>
                    <p className="text-sm text-light-gray mt-1 line-clamp-2">{message}</p>
                </div>
                <button onClick={handleClose} className="text-gray-500 hover:text-white flex-shrink-0">&times;</button>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-primary/50 w-full">
                <div className="h-full bg-primary animate-[progress_5s_linear_forwards]"></div>
            </div>
        </div>
    );
};

export default ChatNotificationPopup;