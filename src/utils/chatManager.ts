import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: 'customer' | 'mechanic'; // For backward compatibility / UI helper
}

export const useChat = (bookingId: string, currentUserId: string | undefined) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!bookingId) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
            } else {
                setMessages(data || []);
            }
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase.channel(`chat:${bookingId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
                (payload) => {
                    const newMessage = payload.new as ChatMessage;
                    setMessages(prev => [...prev, newMessage]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bookingId]);

    const sendMessage = async (text: string) => {
        if (!currentUserId || !text.trim()) return;

        try {
            const { error } = await supabase.from('messages').insert([{
                booking_id: bookingId,
                sender_id: currentUserId,
                content: text
            }]);

            if (error) throw error;

            // Optimistic update is optional since we have real-time subscription, 
            // but can be added for instant feedback if network is slow.
            // For now, we rely on the subscription to add the message to the list.
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    };

    return { messages, sendMessage };
};
