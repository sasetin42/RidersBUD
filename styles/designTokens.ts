// Design System Constants

export const colors = {
    // Primary palette
    primary: {
        50: '#FFF5F0',
        100: '#FFE8DB',
        200: '#FFD1B8',
        300: '#FFB894',
        400: '#FF9F70',
        500: '#FF6B00', // Main primary
        600: '#E65100',
        700: '#CC4700',
        800: '#B33D00',
        900: '#993300',
    },

    // Neutral palette (Dark theme)
    neutral: {
        50: '#F5F5F5',
        100: '#E5E5E5',
        200: '#D4D4D4',
        300: '#A3A3A3',
        400: '#737373',
        500: '#525252',
        600: '#404040',
        700: '#262626',
        800: '#1E1E1E',
        900: '#171717',
        950: '#121212',
    },

    // Semantic colors
    success: {
        light: '#4ADE80',
        main: '#22C55E',
        dark: '#16A34A',
    },
    warning: {
        light: '#FBBF24',
        main: '#F59E0B',
        dark: '#D97706',
    },
    error: {
        light: '#F87171',
        main: '#EF4444',
        dark: '#DC2626',
    },
    info: {
        light: '#60A5FA',
        main: '#3B82F6',
        dark: '#2563EB',
    },
};

export const spacing = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
};

export const borderRadius = {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
};

export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(255, 107, 0, 0.3)',
};

export const typography = {
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
    },
    lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
    },
};

export const transitions = {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
};

export const zIndex = {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
};
