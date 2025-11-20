

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '@google/genai';
import Spinner from './Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { startAssistantChat } from '../services/aiAssistantService';
import { Service, Part } from '../types';
import { useAuth } from '../context/AuthContext';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    sources?: any[]; // Array of grounding chunks
}

interface AIAssistantModalProps {
    onClose: () => void;
}

// This new component will parse the AI's message and render buttons
const AIMessageContent: React.FC<{ text: string; sources?: any[]; onClose: () => void }> = ({ text, sources, onClose }) => {
    const { db } = useDatabase();
    const navigate = useNavigate();

    // Memoize the parsing logic to avoid re-calculating on every render
    const foundItems = useMemo(() => {
        if (!text || !db) return [];

        const allItems: (Service | Part)[] = [...db.services, ...db.parts];
        const uniqueFoundItems: { [key: string]: (Service | Part) & { type: 'service' | 'part' } } = {};

        // Find all mentions of services or parts in the text
        for (const item of allItems) {
            // Use a case-insensitive regex with word boundaries to avoid partial matches (e.g., "oil" in "boil")
            const regex = new RegExp(`\\b${item.name}\\b`, 'ig');
            if (regex.test(text)) {
                // Check if already found to avoid duplicates
                if (!uniqueFoundItems[item.id]) {
                    uniqueFoundItems[item.id] = {
                        ...item,
                        type: 'sku' in item ? 'part' : 'service'
                    };
                }
            }
        }
        return Object.values(uniqueFoundItems);
    }, [text, db]);

    const handleButtonClick = (item: (Service | Part) & { type: 'service' | 'part' }) => {
        if (item.type === 'service') {
            navigate(`/service/${item.id}`);
        } else {
            navigate(`/part/${item.id}`);
        }
        onClose(); // Close the modal after navigating
    };

    return (
        <div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
            {sources && sources.length > 0 && (
                 <div className="mt-3 space-y-2 border-t border-dark-gray/50 pt-3">
                    <p className="text-xs font-semibold text-light-gray mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                        {sources.filter(s => s.web).map((source, index) => (
                            <a 
                                href={source.web.uri} 
                                key={`web-${index}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs bg-field p-1.5 rounded-md hover:bg-gray-600 transition truncate flex items-center gap-1"
                            >
                                📄 <span className="truncate">{source.web.title || new URL(source.web.uri).hostname}</span>
                            </a>
                        ))}
                        {sources.filter(s => s.maps).map((source, index) => (
                            <a 
                                href={source.maps.uri} 
                                key={`map-${index}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs bg-field p-1.5 rounded-md hover:bg-gray-600 transition flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                <span className="truncate">{source.maps.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            {foundItems.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-dark-gray/50 pt-3">
                    <p className="text-xs font-semibold text-light-gray mb-1">Quick Actions:</p>
                    {foundItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleButtonClick(item)}
                            className="w-full text-left bg-field p-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-3"
                        >
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold text-white text-sm">{item.type === 'service' ? 'Book:' : 'Buy:'} {item.name}</p>
                                <p className="text-xs text-primary">{item.type === 'service' ? 'Go to Service' : 'Go to Store'}</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [chat, setChat] = useState<Chat | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { db } = useDatabase();
    const { user } = useAuth();

    useEffect(() => {
        if (!db) {
            setError("Database not available. Please try again later.");
            setIsLoading(false);
            return;
        }

        const initializeChat = async () => {
            try {
                const newChat = startAssistantChat(db, user);
                setChat(newChat);

                const initialResponseStream = await newChat.sendMessageStream({ message: "Hello, introduce yourself." });
                
                let fullText = "";
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
    }, [db, user]);
    
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
        setMessages(prev => [...prev, { sender: 'ai', text: "", sources: [] }]);

        try {
            const responseStream = await chat.sendMessageStream({ message: userInput });
            let fullText = "";
            let sources: any[] = [];
            for await (const chunk of responseStream) {
                fullText += chunk.text;

                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    const newChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
                    newChunks.forEach((newChunk: any) => {
                        const isWeb = newChunk.web && !sources.some(s => s.web?.uri === newChunk.web.uri);
                        const isMap = newChunk.maps && !sources.some(s => s.maps?.uri === newChunk.maps.uri);
                        if (isWeb || isMap) {
                            sources.push(newChunk);
                        }
                    });
                }

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { sender: 'ai', text: fullText, sources: [...sources] };
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
                            {isLoading && index === messages.length - 1 && msg.sender === 'ai' && msg.text === '' ? (
                                <p className="text-sm text-light-gray italic animate-pulse">typing...</p>
                            ) : msg.sender === 'ai' ? (
                                <AIMessageContent text={msg.text} sources={msg.sources} onClose={onClose} />
                            ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
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