import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
    sender: 'customer' | 'mechanic';
    text: string;
    timestamp: number;
}

const getChatHistory = (bookingId: string): ChatMessage[] => {
    try {
        const stored = localStorage.getItem(`chat_${bookingId}`);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse chat history", e);
        return [];
    }
};

const saveChatHistory = (bookingId: string, messages: ChatMessage[]) => {
    try {
        localStorage.setItem(`chat_${bookingId}`, JSON.stringify(messages));
    } catch (e) {
        console.error("Failed to save chat history", e);
    }
};

export const useChat = (bookingId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory(bookingId));

    const handleStorageChange = useCallback((event: StorageEvent) => {
        if (event.key === `chat_${bookingId}`) {
            setMessages(getChatHistory(bookingId));
        }
    }, [bookingId]);

    useEffect(() => {
        // Listen for changes from other tabs/windows
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [handleStorageChange]);

    const sendMessage = (message: ChatMessage) => {
        const newMessages = [...getChatHistory(bookingId), message];
        saveChatHistory(bookingId, newMessages);
        setMessages(newMessages);

        // Dispatch a storage event to notify the current window/tab of the change,
        // as the native 'storage' event only fires for other tabs.
        window.dispatchEvent(
            new StorageEvent('storage', {
                key: `chat_${bookingId}`,
                newValue: JSON.stringify(newMessages),
            })
        );
    };

    return { messages, sendMessage };
};
