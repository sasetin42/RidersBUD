
import React from 'react';
import ridersBudLogo from '../assets/ridersbud-logo.png';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'text-primary';
    className?: string;
    showLogo?: boolean; // New prop to show logo instead of spinner
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'text-primary', className = '', showLogo = false }) => {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const logoSizeClasses = {
        sm: 'w-16',
        md: 'w-24',
        lg: 'w-32',
    };

    // If showLogo is true, display the RidersBUD logo with pulse animation
    if (showLogo) {
        return (
            <div className={`flex flex-col items-center justify-center ${className}`}>
                <img
                    src={ridersBudLogo}
                    alt="RidersBUD"
                    className={`${logoSizeClasses[size]} animate-pulse`}
                    style={{ filter: 'drop-shadow(0 0 20px rgba(254, 120, 3, 0.5))' }}
                />
                <div className="mt-4 flex gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        );
    }

    // Default spinner
    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${color} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Loading"
            role="status"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};

export default Spinner;
