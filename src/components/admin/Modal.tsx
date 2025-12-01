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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto" role="dialog" aria-modal="true">
            <div className="glass-card rounded-2xl p-0 w-full max-w-2xl shadow-2xl border border-white/10 animate-scaleUp my-8 max-h-[90vh] flex flex-col relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-admin-accent/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0 bg-black/20 backdrop-blur-md relative z-10">
                    <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                        &times;
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar relative z-10">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;