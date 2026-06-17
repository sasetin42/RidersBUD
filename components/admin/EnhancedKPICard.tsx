import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface EnhancedKPICardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    subtitle?: string;
    detail?: string;
    compact?: boolean;
    gradient: string;
    onClick?: () => void;
    animate?: boolean;
}

const AnimatedValue: React.FC<{ value: number; duration?: number; formatter?: (v: number) => string }> = ({
    value, duration = 1200, formatter
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);
    const animRef = useRef<number>();

    useEffect(() => {
        const startValue = prevValueRef.current;
        const diff = value - startValue;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + diff * eased);
            setDisplayValue(current);
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = value;
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [value, duration]);

    return <>{formatter ? formatter(displayValue) : displayValue.toLocaleString()}</>;
};

const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
    title, value, icon, trend, subtitle, detail, compact, gradient, onClick, animate = true
}) => {
    const isNumericValue = typeof value === 'number';
    const numericValue = isNumericValue ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
    const isCurrency = typeof value === 'string' && value.startsWith('₱');

    const trendIcon = trend?.isPositive
        ? <TrendingUp size={compact ? 10 : 12} />
        : <TrendingDown size={compact ? 10 : 12} />;

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl ${compact ? 'p-4' : 'p-5'} glass border-none transition-all duration-300 hover:shadow-2xl ${compact ? '' : 'hover:scale-[1.02]'} group min-h-[170px] ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`absolute inset-0 opacity-15 ${gradient}`}></div>
            <div className={`absolute -right-5 -top-5 ${compact ? 'h-20 w-20' : 'h-24 w-24'} rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-white/10`}></div>

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className={`${compact ? 'p-2' : 'p-2.5'} bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner transition-transform duration-300 flex items-center justify-center group-hover:scale-110`}>
                        {icon}
                    </div>
                    <div className="min-w-0 text-right">
                        <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold text-white tracking-tight leading-none`}>
                            {isNumericValue && animate ? (
                                <AnimatedValue
                                    value={numericValue}
                                    formatter={(v) => isCurrency ? `₱${v.toLocaleString()}` : v.toLocaleString()}
                                />
                            ) : (
                                value
                            )}
                        </p>
                        {subtitle && (
                            <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-300 font-semibold mt-1`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 px-2.5 ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} font-extrabold backdrop-blur-md border border-white/5 rounded-lg ${
                            trend.isPositive
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            {trendIcon}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-300 font-bold tracking-tight`}>
                            {title}
                        </p>
                    </div>
                    {detail && (
                        <div className="relative group/tip">
                            <Info size={14} className="text-gray-600 hover:text-gray-400 transition-colors cursor-help" />
                            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[10px] text-gray-400 font-medium opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 shadow-2xl z-50">
                                {detail}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom gradient accent line */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
        </div>
    );
};

export default EnhancedKPICard;
