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

import { initializeFirestore, getFirestore, memoryLocalCache } from "firebase/firestore";

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

// Clear corrupt Firestore IndexedDB databases BEFORE Firestore init to prevent
// "INTERNAL ASSERTION FAILED: Unexpected state (ve: -1)" from corrupt target state.
// deleteDatabase() queues synchronously so the subsequent open() inside
// initializeFirestore will run after the delete per IndexedDB spec (FIFO per database).
try {
    if (typeof indexedDB !== 'undefined') {
        const projectId = firebaseConfig.projectId;
        const knownDbNames = [
            `firestore/[DEFAULT]/${projectId}/(default)`,
            `firestore/[DEFAULT]/${projectId}/(default)/main`,
            `firestore/${projectId}/(default)/main`,
            `firestore/${projectId}/(default)`,
            `firestore/${projectId}`,
        ];
        knownDbNames.forEach(name => {
            try { indexedDB.deleteDatabase(name); } catch (_) {}
        });
        // Also delete any legacy/non-standard Firestore databases asynchronously
        if (indexedDB.databases) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    if (db.name && db.name.startsWith('firestore/')) {
                        try { indexedDB.deleteDatabase(db.name); } catch (_) {}
                    }
                });
            }).catch(() => {});
        }
    }
} catch (_) {}

let dbInstance;
const globalDb = (globalThis as any)._firebaseDb;
if (globalDb) {
    dbInstance = globalDb;
} else {
    try {
        dbInstance = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true
        });
        (globalThis as any)._firebaseDb = dbInstance;
    } catch (e) {
        console.warn("Firestore init with settings failed, falling back to default:", e);
        dbInstance = getFirestore(app);
    }
}
export const db = dbInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
