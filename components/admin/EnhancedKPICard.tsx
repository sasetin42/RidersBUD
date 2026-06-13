import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EnhancedKPICardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    subtitle?: string;
    detail?: string;
    compact?: boolean;
    gradient: string;
}

const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
    title,
    value,
    icon,
    trend,
    subtitle,
    detail,
    compact,
    gradient
}) => (
    <div className={`relative overflow-hidden rounded-2xl ${compact ? 'p-4' : 'p-5'} glass border-none transition-all duration-300 ${compact ? 'hover:shadow-xl' : 'hover:shadow-2xl'} ${compact ? '' : 'hover:scale-[1.02]'} group min-h-[170px]`}>
        <div className={`absolute inset-0 opacity-15 ${gradient}`}></div>
        <div className={`absolute -right-5 -top-5 ${compact ? 'h-20 w-20' : 'h-24 w-24'} rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-white/10`}></div>

        <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className={`${compact ? 'p-2' : 'p-2.5'} bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner transition-transform duration-300 flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold text-white tracking-tight leading-none`}>{value}</p>
                    {subtitle && <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-300 font-semibold mt-1`}>{subtitle}</p>}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} font-semibold backdrop-blur-md border border-white/5 ${trend.isPositive ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                        {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend.value)}%
                    </div>
                )}
            </div>
            <div>
                <p className={`text-sm ${compact ? 'text-sm' : 'text-sm'} text-gray-300 font-semibold tracking-tight`}>{title}</p>
                {detail && <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-1 leading-tight`}>{detail}</p>}
            </div>
        </div>
    </div>
);

export default EnhancedKPICard;
