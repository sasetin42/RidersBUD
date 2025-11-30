<<<<<<< HEAD
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                primary: '#FE7803',
                secondary: '#171617',
                field: '#202938',
                'light-gray': '#A0A0A0',
                'dark-gray': '#2A2A2A',
                // Admin Panel Palette
                'admin-bg': '#111827',
                'admin-sidebar': '#1F2937',
                'admin-card': '#1F2937',
                'admin-border': '#374151',
                'admin-accent': '#F97316',
                'admin-text-primary': '#F3F4F6',
                'admin-text-secondary': '#9CA3AF',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleUp: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                slideInUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'pulse-green': {
                    '0%, 100%': {
                        boxShadow: '0 0 0 0 rgba(40, 167, 69, 0.7)',
                    },
                    '70%': {
                        boxShadow: '0 0 0 10px rgba(40, 167, 69, 0)',
                    },
                },
                'slideInRight': {
                    'from': { transform: 'translateX(100%)', opacity: '0' },
                    'to': { transform: 'translateX(0)', opacity: '1' },
                },
                'slideOutRight': {
                    'from': { transform: 'translateX(0)', opacity: '1' },
                    'to': { transform: 'translateX(100%)', opacity: '0' },
                },
                'progress': {
                    'from': { width: '100%' },
                    'to': { width: '0%' },
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.2s ease-out forwards',
                scaleUp: 'scaleUp 0.2s ease-out forwards',
                slideInUp: 'slideInUp 0.3s ease-out forwards',
            }
        },
    },
    plugins: [],
}
=======
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                primary: '#FE7803',
                secondary: '#171617',
                field: '#202938',
                'light-gray': '#A0A0A0',
                'dark-gray': '#2A2A2A',
                // Admin Panel Palette
                'admin-bg': '#232323',
                'admin-sidebar': '#171618',
                'admin-card': '#171618',
                'admin-border': '#374151',
                'admin-accent': '#F97316',
                'admin-text-primary': '#F3F4F6',
                'admin-text-secondary': '#9CA3AF',
            },
            backdropBlur: {
                xs: '2px',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                scaleUp: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                scaleDown: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(0.95)', opacity: '0' },
                },
                slideInUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInDown: {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideOutRight: {
                    '0%': { transform: 'translateX(0)', opacity: '1' },
                    '100%': { transform: 'translateX(100%)', opacity: '0' },
                },
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                'pulse-green': {
                    '0%, 100%': {
                        boxShadow: '0 0 0 0 rgba(40, 167, 69, 0.7)',
                    },
                    '70%': {
                        boxShadow: '0 0 0 10px rgba(40, 167, 69, 0)',
                    },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                progress: {
                    'from': { width: '100%' },
                    'to': { width: '0%' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                fadeOut: 'fadeOut 0.3s ease-out forwards',
                scaleUp: 'scaleUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                scaleDown: 'scaleDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                slideInUp: 'slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                slideInDown: 'slideInDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                slideInLeft: 'slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                slideInRight: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                slideOutRight: 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                shimmer: 'shimmer 2s linear infinite',
                float: 'float 3s ease-in-out infinite',
            },
            transitionTimingFunction: {
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [],
}
>>>>>>> f51b410 (feat: Implement real-time Admin Panel Settings with database persistence)
