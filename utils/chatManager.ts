import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export interface ChatMessage {
    id?: string;
    sender: 'customer' | 'mechanic';
    text: string;
    timestamp: number;
    attachment?: {
        type: 'image' | 'file';
        url: string;
        name: string;
    };
    attachments?: Array<{
        type: 'image' | 'file';
        url: string;
        name: string;
    }>;
    replyTo?: ChatMessage;
}

/**
 * Custom hook for managing chat messages between mechanic and customer
 * Uses Firebase Firestore for real-time sync
 */
export const useChat = (bookingId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) return;

        // Reference to the messages subcollection
        const messagesRef = collection(db, 'bookings', bookingId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chat messages:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bookingId]);

    // Send a new message
    const sendMessage = async (message: ChatMessage) => {
        if (!bookingId) return;
        try {
            const messagesRef = collection(db, 'bookings', bookingId, 'messages');
            await addDoc(messagesRef, {
                ...message,
                timestamp: Date.now() // Use client time for display immediate, or serverTimestamp for order
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Clear messages (Optional: usually not needed for Firestore unless admin)
    const clearMessages = () => {
        // Not implemented for Firestore to prevent data loss
        console.warn("Clear messages not supported in Firestore mode");
    };

    return {
        messages,
        sendMessage,
        clearMessages,
        loading
    };
};
