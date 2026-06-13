import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Wifi, WifiOff, Zap, Shield, Star } from 'lucide-react';

interface AppLoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    logo?: string;
}

const loadingMessages = [
    'Just a moment...',
    'Still working on it...',
    'Almost there...',
    'Thanks for your patience!'
];

const brandQuotes = [
    'Trusted Car Care Wherever You Are',
    'Your Safety, Our Priority',
    'Professional Service at Your Doorstep',
    'Quality Parts, Expert Mechanics',
];

const particleCount = 12;

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
    message,
    fullScreen = true,
    logo = '/riders-logo.png'
}) => {
    const [showSlowMessage, setShowSlowMessage] = useState(false);
    const [showTimeout, setShowTimeout] = useState(false);
    const [msgIndex, setMsgIndex] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [progress, setProgress] = useState(0);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [phase, setPhase] = useState<'connecting' | 'loading' | 'almost'>('connecting');

    const particles = useMemo(() =>
        Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 2 + Math.random() * 4,
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4,
        })), []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const slowTimer = setTimeout(() => setShowSlowMessage(true), 4000);
        const timeoutTimer = setTimeout(() => setShowTimeout(true), 15000);
        return () => {
            clearTimeout(slowTimer);
            clearTimeout(timeoutTimer);
        };
    }, []);

    useEffect(() => {
        if (!showSlowMessage) return;
        const interval = setInterval(() => {
            setMsgIndex(prev => Math.min(prev + 1, loadingMessages.length - 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [showSlowMessage]);

    useEffect(() => {
        const qInterval = setInterval(() => {
            setQuoteIndex(prev => (prev + 1) % brandQuotes.length);
        }, 6000);
        return () => clearInterval(qInterval);
    }, []);

    useEffect(() => {
        const phaseTimer = setTimeout(() => setPhase('loading'), 2000);
        const almostTimer = setTimeout(() => setPhase('almost'), 6000);
        return () => {
            clearTimeout(phaseTimer);
            clearTimeout(almostTimer);
        };
    }, []);

    useEffect(() => {
        if (phase === 'connecting') {
            const timer = setTimeout(() => setProgress(25), 500);
            return () => clearTimeout(timer);
        }
        if (phase === 'loading') {
            const timer = setInterval(() => {
                setProgress(prev => Math.min(prev + (Math.random() * 8), 85));
            }, 800);
            return () => clearInterval(timer);
        }
        if (phase === 'almost') {
            const timer = setInterval(() => {
                setProgress(prev => Math.min(prev + (Math.random() * 3), 98));
            }, 400);
            return () => clearInterval(timer);
        }
    }, [phase]);

    const containerClass = fullScreen
        ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-screen'
        : 'flex flex-col items-center justify-center min-h-[60vh]';

    const phaseIcon = phase === 'connecting'
        ? <Zap size={16} className="text-primary" />
        : phase === 'loading'
            ? <Shield size={16} className="text-primary" />
            : <Star size={16} className="text-primary" />;

    const phaseText = phase === 'connecting'
        ? 'Connecting'
        : phase === 'loading'
            ? 'Loading'
            : 'Finalizing';

    return (
        <div className={`${containerClass} bg-gradient-to-br from-[#0A0A0A] via-[#0F0A05] to-[#0A0A0A] overflow-hidden select-none`}>
            {/* Animated background grid */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(254, 120, 3, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(254, 120, 3, 0.3) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }} />
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(p => (
                    <div
                        key={p.id}
                        className="absolute rounded-full bg-primary/30 animate-float"
                        style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            opacity: 0.4 + Math.random() * 0.4,
                        }}
                    />
                ))}
            </div>

            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/3 -left-1/3 w-[80vh] h-[80vh] bg-gradient-to-br from-primary/[0.06] via-orange-500/[0.03] to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute -bottom-1/3 -right-1/3 w-[80vh] h-[80vh] bg-gradient-to-tl from-orange-500/[0.05] via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vh] h-[60vh] bg-primary/[0.02] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '3s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-md">
                {/* Logo with glow */}
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] scale-[2] animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-[40px] scale-150 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-white/[0.08] flex items-center justify-center shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-700">
                        <img
                            src={logo}
                            alt="RidersBUD"
                            className="w-28 sm:w-32 object-contain mix-blend-screen"
                            style={{ filter: 'drop-shadow(0 0 25px rgba(254, 120, 3, 0.5))' }}
                        />
                    </div>
                </div>

                {/* Animated spinner ring */}
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-[3px] border-white/[0.05]" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/60 animate-spin" style={{ animationDuration: '1.2s' }} />
                    <div className="absolute inset-[5px] rounded-full border-[3px] border-transparent border-b-orange-400 border-l-orange-400/60 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-[11px] rounded-full border-2 border-transparent border-t-white/20 border-r-white/10 animate-spin" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" style={{ animationDuration: '1.8s' }} />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-[220px]">
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary via-orange-400 to-primary rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                            {phaseIcon}
                            <span className="text-[10px] font-medium text-gray-600 tracking-wider uppercase">{phaseText}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-700">{Math.round(progress)}%</span>
                    </div>
                </div>

                {/* Message */}
                <div className="flex flex-col items-center gap-3 text-center min-h-[80px]">
                    {message ? (
                        <p className="text-sm font-medium text-gray-400 animate-fadeIn">{message}</p>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-gray-400 animate-fadeIn transition-opacity duration-500">
                                <span className="text-primary/80 font-semibold">RidersBUD</span> is preparing your experience
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </>
                    )}

                    {/* Brand quote */}
                    <p className="text-xs text-gray-600 italic animate-fadeIn transition-opacity duration-700 max-w-[260px] leading-relaxed">
                        &ldquo;{brandQuotes[quoteIndex]}&rdquo;
                    </p>

                    {showSlowMessage && !message && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 animate-fadeIn">
                            <Clock size={14} className="text-primary/60" />
                            <span>{loadingMessages[msgIndex]}</span>
                        </div>
                    )}

                    {showTimeout && (
                        <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-xl animate-fadeIn max-w-xs">
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            <span className="leading-relaxed">
                                {isOnline
                                    ? 'Taking longer than usual. You can wait or try refreshing the page.'
                                    : 'You appear to be offline. Please check your internet connection.'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom branding */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-6 h-[1px] bg-white/5" />
                    <Zap size={10} className="text-primary/40" />
                    <span className="w-6 h-[1px] bg-white/5" />
                </div>
                <p className="text-[9px] text-gray-700 font-medium tracking-[0.3em] uppercase">
                    RidersBUD
                </p>
            </div>
        </div>
    );
};

export default AppLoadingScreen;
