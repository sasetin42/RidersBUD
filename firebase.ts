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

import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

let dbInstance;
const globalDb = (globalThis as any)._firebaseDb;
if (globalDb) {
    dbInstance = globalDb;
} else {
    try {
        dbInstance = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            }),
            experimentalForceLongPolling: true,
            experimentalAutoDetectLongPolling: true,
            experimentalLongPollingOptions: {
                timeoutMillis: 30000
            },
            ignoreUndefinedProperties: true
        } as any);
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
