import React from 'react';

interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto" role="dialog" aria-modal="true">
            <div className="glass-dark rounded-2xl p-6 w-full max-w-2xl shadow-glow text-white border border-white/10 animate-scaleUp my-8 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none transition-colors">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;