import { initializeApp, getApps, deleteApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { firebaseConfig } from "../firebase";

const TEMP_APP_NAME = "TempAdminAuthApp";

/**
 * Interface representing the result of initializing the secondary Auth app.
 */
interface SecondaryAuthResult {
    auth: Auth;
    app: FirebaseApp;
}

/**
 * Safe helper to initialize or retrieve the temporary admin Auth app.
 * If the app has already been initialized, retrieves the existing instance.
 */
export const getSecondaryAuth = (): SecondaryAuthResult => {
    const existingApps = getApps();
    let app = existingApps.find((a) => a.name === TEMP_APP_NAME);

    if (!app) {
        app = initializeApp(firebaseConfig, TEMP_APP_NAME);
    }

    const auth = getAuth(app);
    return { auth, app };
};

/**
 * Safe helper to delete the temporary admin Auth app.
 * Automatically checks if the app is still registered before deleting.
 */
export const deleteSecondaryAuth = async (app: FirebaseApp): Promise<void> => {
    const existingApps = getApps();
    const isAppActive = existingApps.some((a) => a.name === app.name);
    if (isAppActive) {
        await deleteApp(app);
    }
};
