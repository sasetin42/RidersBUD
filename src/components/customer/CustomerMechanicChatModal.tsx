import React, { useState, useEffect, useRef } from 'react';
import { Booking, Customer, Mechanic } from '../../types';
import { useChat, ChatMessage } from '../../utils/chatManager';
import { useChatNotification } from '../../context/ChatNotificationContext';

interface CustomerMechanicChatModalProps {
    booking: Booking;
    customer: Customer;
    mechanic: Mechanic;
    onClose: () => void;
}

const CustomerMechanicChatModal: React.FC<CustomerMechanicChatModalProps> = ({ booking, customer, mechanic, onClose }) => {
    const { messages, sendMessage } = useChat(booking.id, customer.id);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { addOpenChat, removeOpenChat } = useChatNotification();

    useEffect(() => {
        addOpenChat(booking.id);
        // Cleanup function to remove the chat id when the modal is closed
        return () => {
            removeOpenChat(booking.id);
        };
    }, [addOpenChat, removeOpenChat, booking.id]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="fixed inset-0 bg-secondary z-50 flex flex-col animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center p-4 bg-[#1D1D1D] border-b border-dark-gray flex-shrink-0">
                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                <div className="flex-1">
                    <h2 className="font-bold text-white">{mechanic.name}</h2>
                    <p className="text-sm text-green-400">Online</p>
                </div>
                <button onClick={onClose} className="text-primary" aria-label="Close chat">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const isCustomer = msg.sender_id === customer.id;
                    return (
                        <div key={index} className={`flex items-end gap-2 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                            {!isCustomer && (
                                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            )}
                            <div className={`max-w-xs p-3 rounded-2xl ${isCustomer ? 'bg-primary text-white rounded-br-none' : 'bg-dark-gray text-white rounded-bl-none'}`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 w-full px-4 py-3 bg-field border border-dark-gray rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" disabled={!input.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default CustomerMechanicChatModal;