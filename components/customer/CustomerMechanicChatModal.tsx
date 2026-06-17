import React, { useState, useEffect, useRef } from 'react';
import { Booking, Customer, Mechanic } from '../../types';
import { useChat, ChatMessage } from '../../utils/chatManager';
import { Send } from 'lucide-react';

interface CustomerMechanicChatModalProps {
    booking: Booking;
    customer: Customer;
    mechanic: Mechanic;
    onClose: () => void;
}

const CustomerMechanicChatModal: React.FC<CustomerMechanicChatModalProps> = ({ booking, customer, mechanic, onClose }) => {
    const { messages, sendMessage } = useChat(booking.id);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        sessionStorage.setItem(`chat_open_${booking.id}`, 'true');
        sessionStorage.removeItem(`chat_closed_${booking.id}`);
        return () => {
            sessionStorage.removeItem(`chat_open_${booking.id}`);
        };
    }, [booking.id]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: ChatMessage = {
            sender: 'customer',
            text: input,
            timestamp: Date.now()
        };
        sendMessage(newMessage);
        setInput('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const newMessage: ChatMessage = {
                sender: 'customer',
                text: '',
                timestamp: Date.now(),
                attachment: {
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: base64,
                    name: file.name
                }
            };
            sendMessage(newMessage);
        };
        reader.readAsDataURL(file);
    };

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

                const newMessage: ChatMessage = {
                    sender: 'customer',
                    text: mapsLink,
                    timestamp: Date.now()
                };
                sendMessage(newMessage);
            },
            (error) => {
                console.warn('Location share failed:', error.message);
            }
        );
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4" role="dialog" aria-modal="true">
            <div className="bg-secondary w-full max-w-md max-h-[85vh] h-[600px] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scaleUp">

                {/* Header */}
                <header className="flex items-center p-4 bg-[#1A1A1A] border-b border-white/5 flex-shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
                    <div className="relative flex items-center w-full">
                        <div className="relative">
                            <img src={mechanic.imageUrl || '/riders-logo.png'} alt={mechanic.name} className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-primary/20" onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }} />
                            <span className="absolute bottom-0 right-4 w-3 h-3 bg-green-500 border-2 border-[#1A1A1A] rounded-full"></span>
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold text-white text-lg leading-tight">{mechanic.name}</h2>
                            <p className="text-xs text-green-400 font-medium tracking-wide ">Online Now</p>
                        </div>
                        <button 
                            onClick={() => {
                                sessionStorage.setItem(`chat_closed_${booking.id}`, 'true');
                                onClose();
                            }} 
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Chat Area */}
                <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121212] custom-scrollbar">
                    <div className="text-center text-xs text-gray-600 my-4">
                        <span className="bg-[#1A1A1A] px-3 py-1 rounded-full">Today</span>
                    </div>

                    {messages.map((msg, index) => {
                        const isMe = msg.sender === 'customer';
                        return (
                            <div key={index} className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <img src={mechanic.imageUrl || '/riders-logo.png'} alt={mechanic.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1" onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }} />
                                )}
                                <div className={`flex flex-col gap-1 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {msg.attachment && msg.attachment.type === 'image' && (
                                        <div className={`rounded-2xl overflow-hidden mb-1 border border-white/10 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                            <img src={msg.attachment.url} alt="attachment" className="max-w-full h-auto max-h-48 object-cover" />
                                        </div>
                                    )}
                                    {msg.text && (
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                            ? 'bg-primary text-white rounded-br-none'
                                            : 'bg-[#252525] text-gray-100 rounded-bl-none border border-white/5'
                                            }`}>
                                            {msg.text.startsWith('https://www.google.com/maps') ? (
                                                <a
                                                    href={msg.text}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-2 mt-1 rounded-xl transition-all duration-200 group ${isMe ? 'bg-black/20 hover:bg-black/30' : 'bg-[#1A1A1A] hover:bg-black/40 border border-white/5'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`font-bold text-sm truncate ${isMe ? 'text-white' : 'text-white group-hover:text-primary transition-colors'}`}>Shared Location</span>
                                                        <span className={`text-[10px] truncate ${isMe ? 'text-white/80' : 'text-gray-400'}`}>Click to view on maps</span>
                                                    </div>
                                                    <div className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-white' : 'text-primary'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </div>
                                                </a>
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-[10px] text-gray-600 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </main>

                {/* Footer / Input */}
                <footer className="p-3 pb-4 bg-[#1A1A1A] border-t border-white/5 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-full">
                        <div className="flex-1 bg-field border border-white/5 rounded-3xl flex items-center px-2 py-1 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                            <button
                                type="button"
                                onClick={handleShareLocation}
                                className="p-2 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                                title="Share Location"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm py-3 px-2 max-h-32"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                            disabled={!input.trim()}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default CustomerMechanicChatModal;
