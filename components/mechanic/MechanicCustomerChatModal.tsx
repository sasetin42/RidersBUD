
import React, { useState, useEffect, useRef } from 'react';
import { Customer, Mechanic } from '../../types';

interface Message {
    sender: 'mechanic' | 'customer';
    text: string;
}

interface MechanicCustomerChatModalProps {
    customer: Customer;
    mechanic: Mechanic;
    onClose: () => void;
}

const MechanicCustomerChatModal: React.FC<MechanicCustomerChatModalProps> = ({ customer, mechanic, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'mechanic', text: `Hi ${customer.name.split(' ')[0]}, this is ${mechanic.name}. I'm on my way for your service appointment.` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = { sender: 'mechanic', text: input };
        setMessages(prev => [...prev, newMessage]);
        setInput('');

        // Simulate customer response
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const customerResponse: Message = { sender: 'customer', text: 'Okay, thank you for the update! See you soon.' };
            setMessages(prev => [...prev, customerResponse]);
        }, 2000 + Math.random() * 1000); // Simulate typing delay
    };

    return (
        <div className="fixed inset-0 bg-secondary z-50 flex flex-col animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center p-4 bg-[#1D1D1D] border-b border-dark-gray flex-shrink-0">
                <img src={customer.picture || `https://i.pravatar.cc/150?u=${customer.id}`} alt={customer.name} className="w-10 h-10 rounded-full object-cover mr-3"/>
                <div className="flex-1">
                    <h2 className="font-bold text-white">{customer.name}</h2>
                    <p className="text-sm text-green-400">Online</p>
                </div>
                <button onClick={onClose} className="text-primary" aria-label="Close chat">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.sender === 'mechanic' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'customer' && (
                        <img src={customer.picture || `https://i.pravatar.cc/150?u=${customer.id}`} alt={customer.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    )}
                        <div className={`max-w-xs p-3 rounded-2xl ${msg.sender === 'mechanic' ? 'bg-primary text-white rounded-br-none' : 'bg-dark-gray text-white rounded-bl-none'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex items-end gap-2 justify-start">
                        <img src={customer.picture || `https://i.pravatar.cc/150?u=${customer.id}`} alt={customer.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className="p-3 rounded-2xl bg-dark-gray rounded-bl-none">
                            <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
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

export default MechanicCustomerChatModal;
