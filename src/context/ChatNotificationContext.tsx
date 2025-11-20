import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ChatNotificationContextType {
    openChatIds: Set<string>;
    addOpenChat: (id: string) => void;
    removeOpenChat: (id: string) => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);

export const useChatNotification = () => {
    const context = useContext(ChatNotificationContext);
    if (!context) {
        throw new Error('useChatNotification must be used within a ChatNotificationProvider');
    }
    return context;
};

export const ChatNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [openChatIds, setOpenChatIds] = useState<Set<string>>(new Set());

    const addOpenChat = useCallback((id: string) => {
        setOpenChatIds(prev => new Set(prev).add(id));
    }, []);

    const removeOpenChat = useCallback((id: string) => {
        setOpenChatIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }, []);

    const value = { openChatIds, addOpenChat, removeOpenChat };

    return (
        <ChatNotificationContext.Provider value={value}>
            {children}
        </ChatNotificationContext.Provider>
    );
};