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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-admin-card rounded-lg p-6 w-full max-w-lg shadow-xl text-admin-text-primary border border-admin-border animate-scaleUp">
                <div className="flex justify-between items-center mb-4 border-b border-admin-border pb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-admin-text-secondary hover:text-admin-text-primary text-3xl leading-none">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;