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

// Single-tab persistent cache (IndexedDB-backed, offline-capable).
// persistentMultipleTabManager is intentionally omitted — it uses localStorage
// for cross-tab lease coordination, which triggers "Another client might have
// garbage-collected our state" warnings when React StrictMode double-mounts
// components or Vite HMR re-executes this module during development.
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache(),
        ignoreUndefinedProperties: true
    });
} catch {
    // Firestore already initialized (e.g. Vite fast-refresh re-import) — reuse the existing instance
    db = getFirestore(app);
}
export { db };

export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
