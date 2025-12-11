import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className={`glass-modal rounded-2xl w-full ${maxWidth} shadow-2xl text-white animate-scaleUp flex flex-col max-h-[90vh] border border-white/10 overflow-hidden`}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0 bg-[#171617]/95 backdrop-blur-md z-10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        &times;
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative z-0">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;