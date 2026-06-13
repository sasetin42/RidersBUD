import React from 'react';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
    className?: string;
}

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    onClick,
    className = '',
}) => {
    const baseStyles = 'rounded-xl transition-all duration-200';

    const variantStyles = {
        default: 'bg-[#1E1E1E] border border-white/5',
        elevated: 'bg-[#1E1E1E] shadow-lg',
        outlined: 'bg-transparent border-2 border-white/10',
        glass: 'bg-white/5 backdrop-blur-md border border-white/10',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const hoverStyles = hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : '';
    const clickStyles = onClick ? 'cursor-pointer active:scale-[0.98]' : '';

    return (
        <div
            className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${clickStyles} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = '',
}) => {
    const variantStyles = {
        primary: 'bg-primary/20 text-primary border-primary/30',
        success: 'bg-green-500/20 text-green-400 border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        neutral: 'bg-white/10 text-gray-300 border-white/20',
    };

    const sizeStyles = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
        lg: 'text-sm px-3 py-1.5',
    };

    return (
        <span
            className={`inline-flex items-center font-bold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        >
            {children}
        </span>
    );
};

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string;
    height?: string;
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'text',
    width,
    height,
    className = '',
}) => {
    const variantStyles = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style = {
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'circular' ? '40px' : undefined),
    };

    return (
        <div
            className={`bg-white/5 animate-pulse ${variantStyles[variant]} ${className}`}
            style={style}
        />
    );
};

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {icon && (
                <div className="mb-4 text-gray-600">
                    {icon}
                </div>
            )}
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-400 mb-6 max-w-md">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg',
        secondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
        ghost: 'bg-transparent text-gray-300 hover:bg-white/5',
        danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
    };

    const sizeStyles = {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm px-4 py-2.5',
        lg: 'text-base px-6 py-3',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : icon}
            {children}
        </button>
    );
};

// Re-export UnifiedProductCard for convenient importing
export { default as UnifiedProductCard } from './UnifiedProductCard';
