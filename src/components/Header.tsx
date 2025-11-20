
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
        <div className="relative flex items-center justify-center p-4 bg-[#1D1D1D] border-b border-dark-gray">
            {showBackButton && (
                <button onClick={() => navigate(-1)} className="absolute left-4 text-primary">
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}
            <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
    );
};

export default Header;
