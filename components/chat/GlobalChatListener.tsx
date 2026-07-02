import React, { useEffect, useRef } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useChatNotification } from '../../context/ChatNotificationContext';
import { db as firestoreDB } from '../../firebase';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';

const GlobalChatListener: React.FC = () => {
    const { db } = useDatabase();
    const { user, isAuthenticated } = useAuth();
    const { mechanic, isMechanicAuthenticated } = useMechanicAuth();
    const { addOpenChat, openChatIds } = useChatNotification();

    // Track mounted timestamp to prevent popping up old messages on page load
    const mountTimeRef = useRef(Date.now());

    // Track openChatIds in ref to access inside effect without dependency
    const openChatIdsRef = useRef(openChatIds);
    useEffect(() => {
        openChatIdsRef.current = openChatIds;
    }, [openChatIds]);

    // Dictionary to keep track of unsubscribe functions for each active booking
    const listenersRef = useRef<{ [key: string]: () => void }>({});

    useEffect(() => {
        if (!db) return;

        let activeBookings: any[] = [];

        // Identify relevant bookings based on user role
        if (isAuthenticated && user) {
            activeBookings = db.bookings.filter(b =>
                b.customerName === user.name &&
                b.status !== 'Completed' &&
                b.status !== 'Cancelled'
            );
        } else if (isMechanicAuthenticated && mechanic) {
            activeBookings = db.bookings.filter(b =>
                b.mechanic?.id === mechanic.id &&
                b.status !== 'Completed' &&
                b.status !== 'Cancelled'
            );
        }

        // 1. Clean up stale listeners (bookings that are no longer active)
        const activeIds = new Set(activeBookings.map(b => b.id));
        Object.keys(listenersRef.current).forEach(bookingId => {
            if (!activeIds.has(bookingId)) {
                if (typeof listenersRef.current[bookingId] === 'function') {
                    listenersRef.current[bookingId](); // Unsubscribe
                }
                delete listenersRef.current[bookingId];
            }
        });

        // 2. Set up new listeners
        activeBookings.forEach(booking => {
            if (listenersRef.current[booking.id]) return; // Already listening

            const messagesRef = collection(firestoreDB, 'bookings', booking.id, 'messages');
            // Listen to messages added AFTER component mount (approx)
            // Note: We listen to ALL recent messages and filter by timestamp in client to be safe with server time diffs
            const q = query(messagesRef, orderBy('timestamp', 'desc'));

            listenersRef.current[booking.id] = onSnapshot(
                q,
                (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const messageData = change.doc.data();

                            // Check if message is essentially "new" (arrived after we started listening)
                            // Allow a small buffer or just strict > mountTime
                            if (messageData.timestamp > mountTimeRef.current) {

                                // Determine sender role to avoid popping up for our own messages
                                const isMe = (isAuthenticated && messageData.sender === 'customer') ||
                                    (isMechanicAuthenticated && messageData.sender === 'mechanic');

                                if (!isMe) {
                                    const isAlreadyOpen = sessionStorage.getItem(`chat_open_${booking.id}`) === 'true';
                                    const isClosed = sessionStorage.getItem(`chat_closed_${booking.id}`) === 'true';
                                    if (!openChatIdsRef.current.has(booking.id) && !isClosed && !isAlreadyOpen) {
                                        addOpenChat(booking.id);
                                    }
                                }
                            }
                        }
                    });
                },
                (error) => {
                    console.warn(`GlobalChatListener: Listener failed for booking ${booking.id}:`, error);
                }
            );
        });

        // Cleanup of stale listeners is handled dynamically above.
    }, [db, isAuthenticated, isMechanicAuthenticated, user, mechanic, addOpenChat]); // openChatIds removed from deps

    // Clean up all active listeners strictly on component unmount
    useEffect(() => {
        return () => {
            Object.values(listenersRef.current).forEach(unsub => {
                if (typeof unsub === 'function') { try { unsub(); } catch (_) {} }
            });
            listenersRef.current = {};
        };
    }, []);

    return null; // This component does not render anything itself
};

export default GlobalChatListener;
