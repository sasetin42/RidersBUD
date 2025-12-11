import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { Bell, User, LogOut, Settings, HelpCircle, AlertTriangle, ChevronLeft } from 'lucide-react';

const MechanicHeader: React.FC<{ title?: string; showBackButton?: boolean }> = ({ title, showBackButton }) => {
    const navigate = useNavigate();
    const { mechanic, updateOnlineStatus, logout } = useMechanicAuth();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // Safety check in case mechanic is null (e.g. loading)
    if (!mechanic) return null;

    const isOnline = mechanic.isOnline ?? true;

    return (
        <>
            <header className="flex items-center justify-between px-5 py-4 bg-[#121212] border-b border-white/5 sticky top-0 z-30 shadow-lg shadow-black/20">
                {/* Left: Title or Welcome */}
                <div className="flex items-center gap-3">
                    {showBackButton && (
                        <button onClick={() => navigate(-1)} className="p-1 -ml-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {title ? (
                        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
                    ) : (
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight">Dashboard</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Welcome, {mechanic.name.split(' ')[0]}</p>
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">

                    {/* Status Toggle */}
                    <div className="flex items-center gap-2 bg-[#1A1A1A] py-1.5 px-3 rounded-full border border-white/5 shadow-inner">
                        <button
                            type="button"
                            className={`${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-600'} relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none`}
                            onClick={() => updateOnlineStatus(!isOnline)}
                        >
                            <span className={`${isOnline ? 'translate-x-4' : 'translate-x-1'} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`} />
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                            {isOnline ? 'ON' : 'OFF'}
                        </span>
                    </div>

                    {/* Notification Bell (Simplified) */}
                    <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-[#121212]"></span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="w-9 h-9 rounded-full border border-white/10 hover:border-primary transition-all overflow-hidden focus:outline-none active:scale-95"
                        >
                            <img
                                src={mechanic.imageUrl || `https://ui-avatars.com/api/?name=${mechanic.name}&background=random`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute top-12 right-0 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp origin-top-right flex flex-col z-50">
                                <div className="p-4 border-b border-white/5 bg-white/5">
                                    <p className="font-bold text-white text-sm truncate">{mechanic.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{mechanic.email}</p>
                                </div>
                                <div className="p-1">
                                    <button onClick={() => navigate('/mechanic/profile')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-200 transition-colors text-left w-full">
                                        <User size={16} className="text-gray-400" /> My Profile
                                    </button>
                                    <button onClick={() => navigate('/mechanic/settings')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-200 transition-colors text-left w-full">
                                        <Settings size={16} className="text-gray-400" /> Settings
                                    </button>
                                    <button onClick={() => { }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-200 transition-colors text-left w-full">
                                        <AlertTriangle size={16} className="text-gray-400" /> Report Issue
                                    </button>
                                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                                    <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-400 transition-colors text-left w-full">
                                        <LogOut size={16} /> Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isProfileMenuOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsProfileMenuOpen(false)} />}
            </header>
        </>
    );
};

export default MechanicHeader;
