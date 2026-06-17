import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ridersbud-10806.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ridersbud-10806",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ridersbud-10806.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "492813766406",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:492813766406:web:c35e8974032a01fb8f9887",
    databaseURL: "https://ridersbud-10806-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);

import { initializeFirestore, getFirestore, persistentLocalCache } from "firebase/firestore";

// Clear stale Firestore localStorage entries to prevent QuotaExceededError
try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('firestore_') || key.startsWith('firebase_') || key.startsWith('_firebase_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
} catch (_) {}

let dbInstance;
try {
    dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache()
    });
} catch (e) {
    console.warn("Firestore init with settings failed, falling back to default:", e);
    dbInstance = getFirestore(app);
}
export const db = dbInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
