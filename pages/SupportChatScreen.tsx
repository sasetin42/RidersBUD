import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import ChatModal from '../components/ChatModal';
import { Service } from '../types';
import { ArrowLeft, MessageSquare } from 'lucide-react';

const CHAT_CLOSED_KEY = 'support_chat_closed';

const SupportChatScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db } = useDatabase();
    const [isChatOpen, setIsChatOpen] = useState(() => {
        return sessionStorage.getItem(CHAT_CLOSED_KEY) !== 'true';
    });

    const supportService: Service = {
        id: 'general-support',
        name: 'General Support',
        description: 'Get help with your bookings, account, or any other inquiries.',
        price: 0,
        estimatedTime: 'N/A',
        imageUrl: '',
        category: 'Support',
        features: []
    } as Service;

    const handleClose = () => {
        sessionStorage.setItem(CHAT_CLOSED_KEY, 'true');
        setIsChatOpen(false);
        navigate(-1);
    };

    const handleOpen = () => {
        sessionStorage.removeItem(CHAT_CLOSED_KEY);
        setIsChatOpen(true);
    };

    useEffect(() => {
        return () => {
            // do not clear flag on unmount — keep closed state across navigations
        };
    }, []);

    if (!db) return null;

    return (
        <div className="min-h-screen bg-[#121212] flex flex-col">
            <header className="p-4 bg-[#1E1E1E] border-b border-white/5 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-white">
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold text-white">Riders Bud Support</h1>
            </header>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">How can we help?</h2>
                    <p className="text-gray-400 mb-6">Our virtual assistant is ready to assist you.</p>
                    <button
                        onClick={handleOpen}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl"
                    >
                        Start Chat
                    </button>
                </div>
            </div>

            {isChatOpen && (
                <ChatModal
                    service={supportService}
                    onClose={handleClose}
                    mode="admin"
                />
            )}
        </div>
    );
};

export default SupportChatScreen;
