
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
        <div className="relative flex items-center justify-center p-4 glass-dark border-b border-white/10 shadow-lg animate-slideInDown">
            {showBackButton && (
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 text-primary hover:text-orange-400 transition-all duration-300 hover:scale-110 active:scale-95 glass-light p-2 rounded-xl"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}
            <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        </div>
    );
};

export default Header;
