import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatNotificationPopupProps {
    senderName: string;
    senderAvatar: string;
    message: string;
    onClose: () => void;
}

const ChatNotificationPopup: React.FC<ChatNotificationPopupProps> = ({
    senderName,
    senderAvatar,
    message,
    onClose,
}) => {
    const [isExiting, setIsExiting] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const initials = senderName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const animationClass = isExiting
        ? 'animate-[slideOutRight_0.3s_ease-out_forwards]'
        : 'animate-[slideInRight_0.3s_ease-out_forwards]';

    return (
        <div
            className={`fixed top-4 left-4 right-4 sm:top-5 sm:left-auto sm:right-5 sm:w-80 z-[100] ${animationClass}`}
            onClick={() => handleClose()}
            role="alert"
            aria-live="assertive"
        >
            <div
                className="relative flex overflow-hidden rounded-2xl border border-[#FE7803]/30 bg-[#1C1C1E]/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left accent bar */}
                <div className="w-[3px] flex-shrink-0 bg-[#FE7803] shadow-[0_0_8px_#FE7803]" />

                <div className="flex flex-col flex-grow px-3 pt-3 pb-0 gap-2">
                    {/* Row 1: Icon + Label + Close */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FE7803]/20 flex-shrink-0">
                            <MessageCircle size={13} color="#FE7803" fill="#FE7803" />
                        </div>
                        <span className="text-[#FE7803] text-xs font-semibold tracking-wide uppercase flex-grow">
                            New Message
                        </span>
                        <button
                            onClick={handleClose}
                            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                            aria-label="Dismiss notification"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Row 2: Avatar + Sender info */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-[#FE7803]/20">
                            {!avatarError && senderAvatar ? (
                                <img
                                    src={senderAvatar}
                                    alt={senderName}
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <span className="text-[#FE7803] text-xs font-bold">{initials}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-white text-sm font-bold leading-tight truncate">{senderName}</p>
                            <p className="text-gray-500 text-xs leading-tight">is messaging you</p>
                        </div>
                    </div>

                    {/* Row 3: Message preview */}
                    <p className="text-gray-400 text-[12px] italic leading-snug line-clamp-2 pb-3">
                        "{message}"
                    </p>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-[3px] right-0 h-[2px] bg-[#FE7803]/20">
                    <div className="h-full bg-[#FE7803] animate-[progress_5s_linear_forwards]" />
                </div>
            </div>
        </div>
    );
};

export default ChatNotificationPopup;
