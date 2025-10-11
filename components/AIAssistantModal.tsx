

import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import Spinner from './Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { startAssistantChat } from '../services/aiAssistantService';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

interface AIAssistantModalProps {
    onClose: () => void;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [chat, setChat] = useState<Chat | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { db } = useDatabase();

    useEffect(() => {
        if (!db) {
            setError("Database not available. Please try again later.");
            setIsLoading(false);
            return;
        }

        const initializeChat = async () => {
            try {
                const newChat = startAssistantChat(db);
                setChat(newChat);

                const initialResponseStream = await newChat.sendMessageStream({ message: "Hello, introduce yourself." });
                
                let fullText = "";
                // Add a placeholder for the initial AI response
                setMessages([{ sender: 'ai', text: "" }]);

                for await (const chunk of initialResponseStream) {
                    fullText += chunk.text;
                    setMessages([{ sender: 'ai', text: fullText }]);
                }
            } catch (err) {
                console.error("Failed to initialize AI assistant:", err);
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setError(`Sorry, I'm having trouble connecting right now. Please check your API key and try again. Error: ${errorMessage}`);
                setMessages([]);
            } finally {
                setIsLoading(false);
            }
        };

        initializeChat();
    }, [db]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userInput = input;
        setInput('');
        setIsLoading(true);
        setError(null);

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
        } catch (err) {
            console.error("Failed to send message:", err);
            const errorMessage = "I'm sorry, an error occurred while getting a response. Please try again.";
            setError(errorMessage);
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { sender: 'ai', text: errorMessage };
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

    const { settings } = db;
    const assistantName = settings.virtualMechanicName || 'RiderAI';
    const assistantAvatar = settings.virtualMechanicImageUrl || 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/virtual_mechanic_avatar.png';

    return (
        <div className="fixed inset-0 bg-secondary z-50 flex flex-col animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="ai-assistant-title">
            <header className="flex items-center p-4 bg-[#1D1D1D] border-b border-dark-gray flex-shrink-0">
                <img src={assistantAvatar} alt={assistantName} className="w-10 h-10 rounded-full object-cover mr-3"/>
                <div className="flex-1">
                     <h2 id="ai-assistant-title" className="text-xl font-bold text-white">{assistantName}</h2>
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
                    <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.sender === 'ai' && (
                           <img src={assistantAvatar} alt={assistantName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-primary" />
                       )}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-dark-gray text-white rounded-bl-none'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <img src={assistantAvatar} alt={assistantName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-primary" />
                         <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-dark-gray text-white rounded-bl-none">
                            <div className="flex items-center gap-1.5">
                               <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                               <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                               <div className="w-2 h-2 bg-light-gray rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-lg text-center">
                        {error}
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
                        placeholder="Ask anything..."
                        className="flex-1 w-full px-4 py-3 bg-field border border-dark-gray rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading || error?.includes('connecting')}
                    />
                    <button type="submit" className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" disabled={isLoading || !input.trim() || error?.includes('connecting')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default AIAssistantModal;