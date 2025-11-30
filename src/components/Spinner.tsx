
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-5 w-5 border-2',
        md: 'h-10 w-10 border-3',
        lg: 'h-16 w-16 border-4'
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={`
                    ${sizeClasses[size]} 
                    rounded-full 
                    border-t-primary 
                    border-r-primary/50
                    border-b-transparent 
                    border-l-transparent
                    animate-spin
                    shadow-glow
                `}
                role="status"
                aria-label="Loading"
            />
        </div>
    );
};

export default Spinner;
