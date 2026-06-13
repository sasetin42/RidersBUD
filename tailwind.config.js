/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Maven Pro', 'sans-serif'],
            },
            fontWeight: {
                thin: '400',
                extralight: '400',
                light: '400',
                normal: '400',
                medium: '400',
                semibold: '600',
                bold: '600',
                extrabold: '600',
                black: '600',
            },
            colors: {
                primary: '#FE7803',
                'primary-hover': '#EA6D02',
                secondary: '#171617',
                field: '#202938',
                'light-gray': '#A0A0A0',
                'dark-gray': '#2A2A2A',
                // Admin Panel Palette - Premium Dark
                'admin-bg': '#0F0F10', // Darker, richer background
                'admin-sidebar': '#151516',
                'admin-card': '#1C1C1E', // Apple-style dark gray
                'admin-border': '#2C2C2E',
                'admin-accent': '#FF8A00', // Vibrant orange
                'admin-text-primary': '#FFFFFF',
                'admin-text-secondary': '#A1A1AA',
                'admin-success': '#10B981',
                'admin-error': '#EF4444',
                'glass-white': 'rgba(255, 255, 255, 0.08)',
                'glass-black': 'rgba(0, 0, 0, 0.6)',
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(255, 138, 0, 0.3)',
                'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                slideInUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    'from': { transform: 'translateX(20px)', opacity: '0' },
                    'to': { transform: 'translateX(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                scaleIn: 'scaleIn 0.2s ease-out forwards',
                slideInUp: 'slideInUp 0.4s ease-out forwards',
                slideInRight: 'slideInRight 0.3s ease-out forwards',
                float: 'float 3s ease-in-out infinite',
                shimmer: 'shimmer 2s linear infinite',
            }
        },
    },
    plugins: [],
}
