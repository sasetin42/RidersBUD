import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db as firestoreDB } from '../firebase';

export function usePresence(userId: string | null, collectionName: string) {
    const userIdRef = useRef(userId);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        if (!userId || !collectionName || typeof userId !== 'string' || !userId.trim()) return;

        const userRef = doc(firestoreDB, collectionName, userId);
        
        // Initial online set using setDoc merge to safely create or update without crashing if doc is created late
        setDoc(userRef, { 
            isOnline: true,
            lastActive: new Date().toISOString() 
        }, { merge: true }).catch(() => {});

        // Heartbeat interval every 20 seconds
        const interval = setInterval(() => {
            if (userIdRef.current) {
                setDoc(userRef, {
                    isOnline: true,
                    lastActive: new Date().toISOString()
                }, { merge: true }).catch(() => {});
            }
        }, 20000);

        return () => {
            clearInterval(interval);
            try { 
                setDoc(userRef, { 
                    isOnline: false,
                    lastActive: new Date().toISOString()
                }, { merge: true }).catch(() => {}); 
            } catch (_) {}
        };
    }, [userId, collectionName]);
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
