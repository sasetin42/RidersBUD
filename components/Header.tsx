
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
    );
};

export default Header;
