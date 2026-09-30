import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    title: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    sizeClass?: string;
    headerActions?: React.ReactNode;
    compact?: boolean;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children, sizeClass, headerActions, compact }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-3 sm:p-5 sm:py-6 overflow-hidden animate-fadeIn"
            role="dialog"
            aria-modal="true"
        >
            {/* Full Screen Edge-to-Edge Backdrop Overlay */}
            <div
                className="fixed inset-0 w-full h-full bg-black/80 backdrop-blur-md transition-all duration-300 pointer-events-auto"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Dialog Card (Elevated above backdrop with high glassmorphism, precisely centered) */}
            <div
                className={`relative z-10 glass-modal rounded-[2rem] w-full ${sizeClass || 'max-w-2xl'} my-auto transform transition-all animate-modalIn max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/10`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between ${compact ? 'p-3 md:py-2.5 md:px-5' : 'p-4 md:py-3.5 md:px-5'} border-b border-white/10 bg-black/20 backdrop-blur-md`}>
                    <div className="flex-1 min-w-0">
                        {typeof title === 'string' ? (
                            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">{title}</h2>
                        ) : (
                            title
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {headerActions}
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all active:scale-95 border border-white/5 hover:border-white/10"
                            aria-label="Close modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className={`flex-1 overflow-y-auto ${compact ? 'p-3 md:p-4' : 'p-4 md:p-5'} custom-scrollbar`}>
                    {children}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : modalContent;
};

export default Modal;
