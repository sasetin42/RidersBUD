import React, { useState, useEffect, useRef } from 'react';
import { Service } from '../types';
import { GoogleGenAI, Chat } from '@google/genai';
import Spinner from './Spinner';
import { useDatabase } from '../context/DatabaseContext';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

interface ChatModalProps {
    service: Service;
    onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ service, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [chat, setChat] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { db } = useDatabase();

    useEffect(() => {
        if (!db) return;

        const allServicesInfo = db.services
            .map(s => `- ${s.name}: ${s.description} (Price: ₱${s.price}, Time: ${s.estimatedTime})`)
            .join('\n');

        const initializeChat = async () => {
            try {
                const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
                if (!apiKey) throw new Error("AI API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-pro',
                    config: {
                        systemInstruction: `You are ${db.settings.virtualMechanicName || 'RiderAI'}, an expert and friendly AI mechanic for RidersBUD. 
                        Your knowledge base consists of all the services we offer. Here is the full list:
                        ${allServicesInfo}
                        
                        A customer is currently looking at the "${service.name}" service.
                        - Initial Service Details:
                        - Name: ${service.name}
                        - Description: ${service.description}
                        - Price: ₱${service.price.toFixed(2)}
                        - Estimated Time: ${service.estimatedTime}

                        Your primary role is to answer their questions about this specific service, but you must also be prepared to answer questions about any other service from the list. Be helpful, professional, and keep your answers precise and easy to understand.
                        
                        Start the conversation by greeting the user and asking how you can help them with the "${service.name}" service.`,
                        thinkingConfig: {
                            thinkingBudget: 32768,
                        },
                    }
                });

                setChat(newChat);

                const initialResponseStream = await newChat.sendMessageStream({ message: "Hello" });

                let fullText = "";
                setMessages([{ sender: 'ai', text: "" }]);

                for await (const chunk of initialResponseStream) {
                    fullText += chunk.text;
                    setMessages([{ sender: 'ai', text: fullText }]);
                }
            } catch (error) {
                console.error("Failed to initialize chat:", error);
                setMessages([{ sender: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
            } finally {
                setIsLoading(false);
            }
        };

        initializeChat();
    }, [service, db]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userInput = input;
        setInput('');
        setIsLoading(true);

        setMessages(prev => [...prev, { sender: 'user', text: userInput }]);
        setMessages(prev => [...prev, { sender: 'ai', text: "" }]);

        try {
            const responseStream = await chat.sendMessageStream({ message: userInput });
            let fullText = "";
            for await (const chunk of responseStream) {
                fullText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { sender: 'ai', text: fullText };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { sender: 'ai', text: "I'm sorry, an error occurred. Please try again." };
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!db) {
        return (
            <div className="fixed inset-0 bg-secondary z-50 flex flex-col items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-secondary z-50 flex flex-col animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between p-4 bg-[#1D1D1D] border-b border-dark-gray flex-shrink-0">
                <div className="text-center flex-1">
                    <h2 className="text-xl font-bold text-white">{db.settings.virtualMechanicName || 'Virtual Mechanic'}</h2>
                    <p className="text-sm text-light-gray">{service.name}</p>
                </div>
                <button onClick={onClose} className="text-primary absolute right-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ai' && (
                            <img
                                src={db.settings.virtualMechanicImageUrl}
                                alt={db.settings.virtualMechanicName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-primary"
                            />
                        )}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-dark-gray text-white rounded-bl-none'}`}>
                            {isLoading && index === messages.length - 1 && msg.sender === 'ai' && msg.text === '' ? (
                                <p className="text-sm text-light-gray italic animate-pulse">typing...</p>
                            ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 w-full px-4 py-3 bg-field border border-dark-gray rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button type="submit" className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" disabled={isLoading || !input.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatModal;
