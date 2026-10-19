import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';

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
                timestamp: Date.now()
            });

            // Dispatch notification to recipient so FCM pushes in real-time
            try {
                const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
                if (bookingSnap.exists()) {
                    const bData = bookingSnap.data();
                    const isSenderMechanic = message.sender === 'mechanic';
                    const recipientId = isSenderMechanic ? bData.customerId : bData.mechanicId;
                    const recipientRole = isSenderMechanic ? 'customer' : 'mechanic';
                    const senderLabel = isSenderMechanic ? (bData.mechanic?.name || 'Mechanic') : (bData.customerName || 'Customer');

                    if (recipientId) {
                        const notifsRef = collection(db, 'notifications');
                        await addDoc(notifsRef, {
                            recipientId: `${recipientRole}-${recipientId}`,
                            recipientRole,
                            title: `💬 New Message from ${senderLabel}`,
                            message: message.text ? (message.text.length > 70 ? message.text.substring(0, 67) + '...' : message.text) : 'Sent an attachment',
                            type: 'info',
                            link: recipientRole === 'customer' ? `/support-chat?bookingId=${bookingId}` : `/support-chat?bookingId=${bookingId}`,
                            date: new Date().toISOString(),
                            timestamp: Date.now(),
                            status: 'unread',
                            read: false
                        });
                    }
                }
            } catch (notifErr) {
                console.warn('[useChat] Push notification dispatch non-critical error:', notifErr);
            }
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
