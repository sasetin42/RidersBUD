import React from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`inline-flex ${className}`}>
            {children}
        </div>
    );
};

export default Tooltip;
