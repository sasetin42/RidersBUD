import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { db as firestoreDB } from '../firebase';

export function usePresence(userId: string | null, collectionName: string) {
    const userIdRef = useRef(userId);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        if (!userId || !collectionName) return;

        const userRef = doc(firestoreDB, collectionName, userId);
        
        // Initial online set
        updateDoc(userRef, { 
            isOnline: true,
            lastActive: new Date().toISOString() 
        }).catch(() => {});

        // Heartbeat interval every 20 seconds
        const interval = setInterval(() => {
            updateDoc(userRef, {
                isOnline: true,
                lastActive: new Date().toISOString()
            }).catch(() => {});
        }, 20000);

        // beforeunload is optional for online tracking; removing it avoids repeatedly
        // attaching listeners when auth/presence hooks mount/unmount.
        return () => {
            clearInterval(interval);
            updateDoc(userRef, { isOnline: false }).catch(() => {});
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

        return unsub;
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
