import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
    message?: string;
    showTimeoutMessage?: boolean;
    timeoutSeconds?: number;
}

const Spinner: React.FC<SpinnerProps> = ({
    size = 'md',
    color = 'text-primary',
    className = '',
    message,
    showTimeoutMessage = false,
    timeoutSeconds = 3
}) => {
    const [showSlowMessage, setShowSlowMessage] = useState(false);
    const [showTimeout, setShowTimeout] = useState(false);

    useEffect(() => {
        if (!showTimeoutMessage) return;

        const slowTimer = setTimeout(() => setShowSlowMessage(true), timeoutSeconds * 1000);
        const timeoutTimer = setTimeout(() => setShowTimeout(true), (timeoutSeconds + 5) * 1000);

        return () => {
            clearTimeout(slowTimer);
            clearTimeout(timeoutTimer);
        };
    }, [showTimeoutMessage, timeoutSeconds]);

    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const loadingMessages = [
        'Just a moment...',
        'Still working on it...',
        'Almost there...',
        'Thanks for your patience!'
    ];

    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!showSlowMessage) return;
        const interval = setInterval(() => {
            setMsgIndex(prev => Math.min(prev + 1, loadingMessages.length - 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [showSlowMessage]);

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <svg
                className={`animate-spin ${sizeClasses[size]} ${color} ${className}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-label="Loading"
                role="status"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {message && <p className="text-sm text-gray-400">{message}</p>}
            {showSlowMessage && !message && (
                <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                    <Clock size={14} />
                    <span>{loadingMessages[msgIndex]}</span>
                </div>
            )}
            {showTimeout && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                    <AlertTriangle size={12} />
                    <span>Taking longer than expected. Please check your connection.</span>
                </div>
            )}
        </div>
    );
};

export default Spinner;
