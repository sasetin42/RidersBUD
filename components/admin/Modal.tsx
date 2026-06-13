import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="glass-modal rounded-[2rem] w-full max-w-2xl transform transition-all animate-modalIn max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-white/5">
                    <h2 className="text-xl md:text-2xl font-black text-white  tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
