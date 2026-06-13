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
        updateDoc(userRef, { isOnline: true }).catch(() => {});

        const handleBeforeUnload = () => {
            try {
                const url = `https://firestore.googleapis.com/v1/projects/${firestoreDB.app.options.projectId}/databases/(default)/documents/${collectionName}/${userId}?updateMask.fieldPaths=isOnline`;
                const data = JSON.stringify({
                    fields: {
                        isOnline: { booleanValue: false }
                    }
                });
                navigator.sendBeacon(url, data);
            } catch (e) {
                // fallback: nothing
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
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
