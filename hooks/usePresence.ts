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
        
        // Initial heartbeat (only when online)
        if (navigator.onLine) {
            const initialPayload: { lastActive: string; isOnline?: boolean } = {
                lastActive: new Date().toISOString()
            };
            if (autoSetOnline) {
                initialPayload.isOnline = true;
            }

            setDoc(userRef, initialPayload, { merge: true }).catch(() => {});
        }

        // Heartbeat interval throttled to 60 seconds (prevents Firestore offline mutation buffer overflow)
        const interval = setInterval(() => {
            // Only send presence ping when tab is visible and network is online
            if (userIdRef.current && document.visibilityState === 'visible' && navigator.onLine) {
                const tickPayload: { lastActive: string; isOnline?: boolean } = {
                    lastActive: new Date().toISOString()
                };
                if (autoSetOnline) {
                    tickPayload.isOnline = true;
                }
                setDoc(userRef, tickPayload, { merge: true }).catch((err) => {
                    // If local cache/storage quota is exceeded, gracefully ignore
                    if (String(err?.message || err).includes('quota') || String(err?.message || err).includes('QuotaExceededError')) {
                        // Suppress
                    }
                });
            }
        }, 60000);

        return () => {
            clearInterval(interval);
            try { 
                if (navigator.onLine) {
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
