import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
    disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 120,
    className = '',
    disabled = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const gap = 10; // distance from trigger

        let top = 0;
        let left = 0;

        if (position === 'right') {
            top = rect.top + rect.height / 2;
            left = rect.right + gap;
        } else if (position === 'left') {
            top = rect.top + rect.height / 2;
            left = rect.left - gap;
        } else if (position === 'bottom') {
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2;
        } else {
            // default 'top'
            top = rect.top - gap;
            left = rect.left + rect.width / 2;
        }

        setCoords({ top, left });
    };

    const handleMouseEnter = () => {
        if (disabled || !content) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        updatePosition();
        timeoutRef.current = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            const handleScrollOrResize = () => updatePosition();
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
            return () => {
                window.removeEventListener('scroll', handleScrollOrResize, true);
                window.removeEventListener('resize', handleScrollOrResize);
            };
        }
    }, [isVisible]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Translate alignments based on position
    const getTransformStyle = () => {
        switch (position) {
            case 'right':
                return 'translateY(-50%)';
            case 'left':
                return 'translate(-100%, -50%)';
            case 'bottom':
                return 'translateX(-50%)';
            case 'top':
            default:
                return 'translate(-50%, -100%)';
        }
    };

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
            className={`inline-flex ${className}`}
        >
            {children}

            {isVisible && !disabled && content && typeof document !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        transform: getTransformStyle(),
                        zIndex: 99999,
                    }}
                    className="pointer-events-none transition-all duration-200 ease-out animate-fadeIn"
                >
                    <div className="relative px-3 py-1.5 rounded-xl bg-[#1e1e24]/95 text-white text-xs font-semibold tracking-wide border border-white/10 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_0_15px_rgba(254,120,3,0.15)] backdrop-blur-md whitespace-nowrap flex items-center gap-1.5">
                        {/* Subtle left arrow for right-positioned tooltips */}
                        {position === 'right' && (
                            <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1e1e24] border-l border-b border-white/10 rotate-45" />
                        )}
                        {position === 'left' && (
                            <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1e1e24] border-r border-t border-white/10 rotate-45" />
                        )}
                        {position === 'bottom' && (
                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e1e24] border-l border-t border-white/10 rotate-45" />
                        )}
                        {position === 'top' && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e1e24] border-r border-b border-white/10 rotate-45" />
                        )}
                        <span className="relative z-10">{content}</span>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
