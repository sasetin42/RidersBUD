
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false }) => {
    const navigate = useNavigate();

    return (
        <div className="relative flex items-center justify-center p-4 glass-dark border-b border-glass-light shadow-glass backdrop-blur-xl animate-fade-in">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 gradient-radial opacity-30 pointer-events-none" />

            {showBackButton && (
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 z-10 btn-glass p-2.5 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shadow-glow-sm group"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6 text-primary group-hover:text-orange-400 transition-colors" />
                </button>
            )}

            <h1 className="text-xl font-bold tracking-tight relative z-10">
                <span className="gradient-text drop-shadow-lg">{title}</span>
            </h1>
        </div>
    );
};

export default Header;
