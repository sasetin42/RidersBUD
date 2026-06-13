import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Compass } from 'lucide-react';

export interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

interface TourOverlayProps {
    steps: TourStep[];
    role: 'customer' | 'mechanic';
    onComplete: () => void;
    onSkip: () => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({ steps, role, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);

    const totalSteps = steps.length;
    const isLastStep = currentStep === totalSteps - 1;

    useEffect(() => {
        setProgress(((currentStep + 1) / totalSteps) * 100);
    }, [currentStep, totalSteps]);

    const handleNext = useCallback(() => {
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    }, [isLastStep, onComplete]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'Escape') onSkip();
    }, [handleNext, handlePrev, onSkip]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const step = steps[currentStep];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="w-full max-w-lg bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header with progress bar */}
                <div className="relative h-2 bg-white/5">
                    <motion.div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-rose-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                </div>

                <div className="p-8">
                    {/* Close button */}
                    <button
                        onClick={onSkip}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                        <X size={18} />
                    </button>

                    {/* Icon circle */}
                    <motion.div
                        key={`icon-${currentStep}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-gradient-to-br ${step.color} shadow-lg`}
                    >
                        <div className="text-white">
                            {step.icon}
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h2
                        key={`title-${currentStep}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-black text-white text-center mb-3 tracking-tight"
                    >
                        {step.title}
                    </motion.h2>

                    {/* Description */}
                    <motion.p
                        key={`desc-${currentStep}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm text-gray-300 text-center leading-relaxed max-w-sm mx-auto"
                    >
                        {step.description}
                    </motion.p>

                    {/* Step indicators */}
                    <div className="flex items-center justify-center gap-2 mt-8 mb-6">
                        {steps.map((_, index) => (
                            <motion.button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`rounded-full transition-all ${
                                    index === currentStep
                                        ? 'w-8 h-2 bg-orange-500'
                                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                                }`}
                                animate={index === currentStep ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={currentStep === 0 ? onSkip : handlePrev}
                            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                currentStep === 0
                                    ? 'text-gray-500 hover:text-gray-300'
                                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            {currentStep === 0 ? 'Skip Tour' : (
                                <><ChevronLeft size={16} /> Back</>
                            )}
                        </button>

                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 flex items-center gap-2"
                        >
                            {isLastStep ? (
                                <><Check size={16} /> Got It!</>
                            ) : (
                                <>{'Next'} <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer branding */}
                <div className="px-8 pb-4 text-center">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black flex items-center justify-center gap-1">
                        <Compass size={10} />
                        {role === 'customer' ? 'RidersBUD • Customer Guide' : 'RidersBUD • Mechanic Guide'}
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TourOverlay;
