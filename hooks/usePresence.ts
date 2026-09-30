import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db as firestoreDB } from '../firebase';

export function usePresence(userId: string | null, collectionName: string, autoSetOnline: boolean = true) {
    const userIdRef = useRef(userId);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        if (!userId || !collectionName || typeof userId !== 'string' || !userId.trim()) return;

        const userRef = doc(firestoreDB, collectionName, userId);
        
        // Initial heartbeat
        const initialPayload: { lastActive: string; isOnline?: boolean } = {
            lastActive: new Date().toISOString()
        };
        if (autoSetOnline) {
            initialPayload.isOnline = true;
        }

        setDoc(userRef, initialPayload, { merge: true }).catch(() => {});

        // Heartbeat interval every 20 seconds
        const interval = setInterval(() => {
            if (userIdRef.current) {
                const tickPayload: { lastActive: string; isOnline?: boolean } = {
                    lastActive: new Date().toISOString()
                };
                if (autoSetOnline) {
                    tickPayload.isOnline = true;
                }
                setDoc(userRef, tickPayload, { merge: true }).catch(() => {});
            }
        }, 20000);

        return () => {
            clearInterval(interval);
            try { 
                if (autoSetOnline) {
                    setDoc(userRef, { 
                        isOnline: false,
                        lastActive: new Date().toISOString()
                    }, { merge: true }).catch(() => {}); 
                } else {
                    setDoc(userRef, { 
                        lastActive: new Date().toISOString()
                    }, { merge: true }).catch(() => {}); 
                }
            } catch (_) {}
        };
    }, [userId, collectionName, autoSetOnline]);
}

export function useOnlineStatus(userId: string | null, collectionName: string): boolean {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!userId || !collectionName) return;

        const userRef = doc(firestoreDB, collectionName, userId);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setIsOnline(data?.isOnline === true);
            }
        });

        return () => { try { unsub(); } catch (_) {} };
    }, [userId, collectionName]);

    return isOnline;
}

export function useAdminOnlineStatus(): boolean {
    const [anyAdminOnline, setAnyAdminOnline] = useState(false);

    useEffect(() => {
        const adminRef = collection(firestoreDB, 'adminUsers');
        const unsub = onSnapshot(adminRef, (snapshot) => {
            const online = snapshot.docs.some(doc => doc.data()?.isOnline === true);
            setAnyAdminOnline(online);
        });

        return unsub;
    }, []);

    return anyAdminOnline;
}
