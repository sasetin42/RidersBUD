import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import ChatModal from '../components/ChatModal';
import { SupportCallButton } from '../components/CallUI';
import { Service } from '../types';
import { ArrowLeft, MessageSquare, Phone } from 'lucide-react';
import CustomerHeader from '../components/CustomerHeader';

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
            <CustomerHeader title="Live Support" showBackButton={true} icon={<MessageSquare size={22} />} />

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md w-full bg-[#1e1e1e] border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 relative group hover:border-primary/40 transition-colors">
                        <span className="absolute inset-0 rounded-3xl bg-primary/5 animate-ping"></span>
                        <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">How can we help?</h2>
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed mb-8">
                        Our Live Support Agents are online and ready to assist you. Start a real-time chat or call us directly.
                    </p>
                    <div className="flex flex-col items-center gap-3 w-full">
                        <button
                            onClick={handleOpen}
                            className="w-full py-4 bg-primary hover:bg-orange-600 text-white font-black tracking-widest text-xs uppercase rounded-xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
                        >
                            Start Live Chat
                        </button>
                        <SupportCallButton 
                            type="audio" 
                            size="lg" 
                            className="w-full max-w-xs justify-center"
                        />
                    </div>
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
