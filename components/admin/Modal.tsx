import React, { useEffect } from 'react';
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

    return (
        <div
            className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn"
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`glass-modal rounded-[2rem] w-full ${sizeClass || 'max-w-2xl'} transform transition-all animate-modalIn max-h-[90vh] flex flex-col overflow-hidden`}
            >
                <div className={`flex items-center justify-between ${compact ? 'p-3 md:py-2.5 md:px-5' : 'p-4 md:py-3.5 md:px-5'} border-b border-white/5`}>
                    <div className="flex-1 min-w-0">
                        {typeof title === 'string' ? (
                            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">{title}</h2>
                        ) : (
                            title
                        )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        {headerActions}
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                            aria-label="Close modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div className={`flex-1 overflow-y-auto ${compact ? 'p-3 md:p-4' : 'p-4 md:p-5'} custom-scrollbar`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
