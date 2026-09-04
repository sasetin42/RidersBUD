/**
 * Safe Geolocation Utilities
 * Prevents browser console warnings ("Geolocation permission has been blocked as the user has ignored...")
 * by proactively checking navigator.permissions BEFORE calling any navigator.geolocation methods.
 *
 * Key guarantees:
 *  - Permission query starts synchronously as soon as module loads
 *  - When permission is 'denied', NO navigator.geolocation calls are made (browser-level warning completely prevented)
 *  - Subscriptions via onPermissionChange() notify immediately when user updates site settings
 *  - Provides safeClearWatch to cleanly clear watch IDs
 */

type PermissionState = 'granted' | 'denied' | 'prompt' | null;

let cachedPermissionState: PermissionState = null;
let permissionStatusHandle: PermissionStatus | null = null;
let permissionQueryPromise: Promise<boolean> | null = null;
const changeListeners: Array<(state: PermissionState) => void> = [];

function notifyListeners(state: PermissionState): void {
    changeListeners.forEach(fn => {
        try { fn(state); } catch (_) { /* ignore listener errors */ }
    });
}

/**
 * Register a callback that fires whenever geolocation permission state changes.
 * Returns an unsubscribe function.
 */
export function onPermissionChange(cb: (state: PermissionState) => void): () => void {
    changeListeners.push(cb);
    return () => {
        const idx = changeListeners.indexOf(cb);
        if (idx !== -1) changeListeners.splice(idx, 1);
    };
}

/** Returns the current cached permission state synchronously (null = not yet queried). */
export function getCachedPermissionState(): PermissionState {
    return cachedPermissionState;
}

/**
 * Queries and caches the current geolocation permission.
 * Attaches a persistent PermissionStatus.onchange listener so cachedPermissionState
 * stays accurate whenever the user grants/revokes via browser settings.
 */
export async function isGeolocationPermissionDenied(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
    if (!('geolocation' in navigator)) return true;

    // If we already know it's denied from live handle or cache, return immediately
    if (cachedPermissionState === 'denied') return true;

    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        if (!permissionQueryPromise) {
            permissionQueryPromise = navigator.permissions.query({ name: 'geolocation' as PermissionName })
                .then(status => {
                    permissionStatusHandle = status;
                    cachedPermissionState = status.state as PermissionState;

                    status.onchange = () => {
                        cachedPermissionState = status.state as PermissionState;
                        notifyListeners(cachedPermissionState);
                    };

                    return cachedPermissionState === 'denied';
                })
                .catch(() => {
                    return cachedPermissionState === 'denied';
                });
        }
        return permissionQueryPromise;
    }

    return cachedPermissionState === 'denied';
}

/**
 * Initialises the geolocation permission monitor on app start.
 * Should be called once early. Primes the permission cache
 * and subscribes to future state changes so callers get instant answers.
 */
export function initPermissionMonitor(): void {
    isGeolocationPermissionDenied().catch(() => {});
}

// Automatically initiate permission query on script evaluation
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    initPermissionMonitor();
}

/**
 * Safe wrapper around navigator.geolocation.getCurrentPosition.
 * Will NOT invoke navigator.geolocation if permission is denied,
 * preventing the Chrome browser-level blocked prompt console warning.
 */
export async function safeGetCurrentPosition(
    onSuccess: PositionCallback,
    onError?: PositionErrorCallback,
    options?: PositionOptions
): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        onError?.({
            code: 2,
            message: 'Geolocation is not supported by your browser/device.',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
        } as GeolocationPositionError);
        return;
    }

    const isDenied = await isGeolocationPermissionDenied();
    if (isDenied) {
        onError?.({
            code: 1,
            message: 'Geolocation permission has been blocked or denied.',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
        } as GeolocationPositionError);
        return;
    }

    try {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    } catch (_) {
        onError?.({
            code: 1,
            message: 'Unable to access geolocation.',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
        } as GeolocationPositionError);
    }
}

/**
 * Safe wrapper around navigator.geolocation.watchPosition.
 * Returns null immediately if permission is denied.
 */
export async function safeWatchPosition(
    onSuccess: PositionCallback,
    onError?: PositionErrorCallback,
    options?: PositionOptions
): Promise<number | null> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        return null;
    }

    const isDenied = await isGeolocationPermissionDenied();
    if (isDenied) {
        onError?.({
            code: 1,
            message: 'Geolocation permission is denied.',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
        } as GeolocationPositionError);
        return null;
    }

    try {
        return navigator.geolocation.watchPosition(onSuccess, onError, options);
    } catch (_) {
        return null;
    }
}

/**
 * Safe wrapper around navigator.geolocation.clearWatch.
 */
export function safeClearWatch(watchId: number | null): void {
    if (watchId !== null && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
            navigator.geolocation.clearWatch(watchId);
        } catch (_) {}
    }
}


