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

    return (cachedPermissionState as PermissionState) === 'denied';
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

/**
 * Standard coordinates for Philippine cities and delivery dispatch hubs.
 */
const KNOWN_PH_LOCATIONS: Record<string, { lat: number; lng: number }> = {
    'carmona': { lat: 14.3149, lng: 121.0583 },
    'carmona city': { lat: 14.3149, lng: 121.0583 },
    'binan': { lat: 14.3333, lng: 121.0833 },
    'biñan': { lat: 14.3333, lng: 121.0833 },
    'santa rosa': { lat: 14.3122, lng: 121.1114 },
    'sta rosa': { lat: 14.3122, lng: 121.1114 },
    'calamba': { lat: 14.2117, lng: 121.1656 },
    'cabuyao': { lat: 14.2783, lng: 121.1250 },
    'san pedro': { lat: 14.3597, lng: 121.0506 },
    'dasmarinas': { lat: 14.3294, lng: 120.9367 },
    'dasmariñas': { lat: 14.3294, lng: 120.9367 },
    'tagaytay': { lat: 14.1153, lng: 120.9621 },
    'silang': { lat: 14.2253, lng: 120.9739 },
    'general trias': { lat: 14.3853, lng: 120.8808 },
    'bacoor': { lat: 14.4607, lng: 120.9669 },
    'imus': { lat: 14.4296, lng: 120.9367 },
    'manila': { lat: 14.5995, lng: 120.9842 },
    'quezon city': { lat: 14.6760, lng: 121.0437 },
    'makati': { lat: 14.5547, lng: 121.0244 },
    'taguig': { lat: 14.5176, lng: 121.0509 },
    'pasig': { lat: 14.5764, lng: 121.0851 },
    'paranaque': { lat: 14.4793, lng: 121.0198 },
    'parañaque': { lat: 14.4793, lng: 121.0198 },
    'muntinlupa': { lat: 14.4081, lng: 121.0415 },
    'alabang': { lat: 14.4172, lng: 121.0437 },
    'las pinas': { lat: 14.4445, lng: 120.9939 },
    'las piñas': { lat: 14.4445, lng: 120.9939 }
};

/**
 * Official RidersBUD Parts and Tools Physical Store & Logistics Hub
 * Located at Carmona Commercial Center, Governor's Drive, Cavite, Philippines.
 */
export const RIDERSBUD_STORE_LOCATION = {
    name: 'RidersBUD Parts & Tools Store',
    shortName: 'RidersBUD Store',
    address: "Carmona Commercial Center, Governor's Drive, Cavite, Philippines",
    lat: 14.3149,
    lng: 121.0583,
    phone: '+63 917 888 7433',
    contactPerson: 'RidersBUD Parts Dispatch Hub'
};

/**
 * Resolves latitude and longitude coordinates from an address string or city name.
 * Falls back to Carmona / Metro Manila coordinates if unspecified.
 */
export function geocodeAddressOrCity(addressOrCity?: string | null): { lat: number; lng: number } {
    if (!addressOrCity) {
        return { lat: 14.3149, lng: 121.0583 }; // Default Carmona, Cavite Hub
    }
    const clean = addressOrCity.toLowerCase().trim();
    for (const [key, coords] of Object.entries(KNOWN_PH_LOCATIONS)) {
        if (clean.includes(key)) {
            return coords;
        }
    }
    return { lat: 14.3149, lng: 121.0583 };
}

/**
 * Searches Nominatim OpenStreetMap for coordinates matching an address string.
 */
export async function forwardGeocodeAddress(addressQuery: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
    if (!addressQuery || !addressQuery.trim()) return null;
    const clean = addressQuery.trim();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1&countrycodes=ph`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            return {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: item.display_name || clean
            };
        }
    } catch (_) {}
    // Fallback to static dictionary
    const fallback = geocodeAddressOrCity(clean);
    return {
        lat: fallback.lat,
        lng: fallback.lng,
        displayName: clean
    };
}

/**
 * Resolves dedicated Origin (RidersBUD Store) and Destination (Client/Customer delivery location)
 * specifically for E-Commerce Parts and Tools orders.
 * Dynamically accepts admin system settings overrides (db?.settings) for the store origin pin.
 */
export function resolveOrderTrackingLocations(order: any, user?: any, storeSettings?: any) {
    const raw = order?.rawBooking || order || {};
    const shipping = raw.shippingAddress || order?.shippingAddress;

    // 1. Resolve Store Origin from Settings or Fallback Constants
    const storeLat = (typeof storeSettings?.storeLatitude === 'number' && !isNaN(storeSettings.storeLatitude))
        ? storeSettings.storeLatitude
        : RIDERSBUD_STORE_LOCATION.lat;

    const storeLng = (typeof storeSettings?.storeLongitude === 'number' && !isNaN(storeSettings.storeLongitude))
        ? storeSettings.storeLongitude
        : RIDERSBUD_STORE_LOCATION.lng;

    const storeName = (storeSettings?.storeName && String(storeSettings.storeName).trim())
        ? String(storeSettings.storeName).trim()
        : RIDERSBUD_STORE_LOCATION.name;

    const storeAddress = (storeSettings?.storeAddress && String(storeSettings.storeAddress).trim())
        ? String(storeSettings.storeAddress).trim()
        : ((storeSettings?.address && String(storeSettings.address).trim())
            ? String(storeSettings.address).trim()
            : RIDERSBUD_STORE_LOCATION.address);

    const storePhone = (storeSettings?.storePhone && String(storeSettings.storePhone).trim())
        ? String(storeSettings.storePhone).trim()
        : RIDERSBUD_STORE_LOCATION.phone;

    // 2. Format full customer address string
    let destinationAddress = 'Customer Delivery Address, Carmona City';
    let addressSearchSeed = '';

    if (typeof shipping === 'object' && shipping !== null) {
        const parts = [shipping.addressLine1, shipping.city, shipping.zipCode].filter(Boolean);
        if (parts.length > 0) {
            destinationAddress = parts.join(', ');
            addressSearchSeed = `${shipping.addressLine1 || ''} ${shipping.city || ''}`;
        }
    } else if (typeof shipping === 'string' && shipping.trim()) {
        destinationAddress = shipping.trim();
        addressSearchSeed = shipping.trim();
    } else if (order?.dropoffLocation) {
        destinationAddress = order.dropoffLocation;
        addressSearchSeed = order.dropoffLocation;
    } else if (user?.address) {
        destinationAddress = user.address;
        addressSearchSeed = user.address;
    }

    // 3. Prioritize actual GPS/realtime coordinates stored on order/user if available
    let custLat: number | undefined;
    let custLng: number | undefined;

    if (typeof raw.customerLatitude === 'number' && typeof raw.customerLongitude === 'number' && !isNaN(raw.customerLatitude)) {
        custLat = raw.customerLatitude;
        custLng = raw.customerLongitude;
    } else if (typeof order?.latitude === 'number' && typeof order?.longitude === 'number' && !isNaN(order.latitude)) {
        custLat = order.latitude;
        custLng = order.longitude;
    } else if (typeof shipping?.latitude === 'number' && typeof shipping?.longitude === 'number' && !isNaN(shipping.latitude)) {
        custLat = shipping.latitude;
        custLng = shipping.longitude;
    } else if (typeof user?.latitude === 'number' && typeof user?.longitude === 'number' && !isNaN(user.latitude)) {
        custLat = user.latitude;
        custLng = user.longitude;
    } else {
        const resolvedCustomerCoords = geocodeAddressOrCity(addressSearchSeed || destinationAddress);
        custLat = resolvedCustomerCoords.lat;
        custLng = resolvedCustomerCoords.lng;
    }

    const latDiff = Math.abs(custLat - storeLat);
    const lngDiff = Math.abs(custLng - storeLng);

    if (latDiff < 0.001 && lngDiff < 0.001) {
        // Offset customer into residential neighborhood (~1.8 km driving distance)
        custLat = storeLat + 0.0128;
        custLng = storeLng + 0.0105;
    }

    return {
        store: {
            name: storeName,
            shortName: storeName.includes('RidersBUD') ? storeName : `RidersBUD - ${storeName}`,
            address: storeAddress,
            lat: storeLat,
            lng: storeLng,
            phone: storePhone
        },
        customer: {
            name: raw.recipientName || raw.customerName || user?.name || 'Customer / Client',
            phone: raw.contactPhone || raw.phone || user?.phone || '',
            address: destinationAddress,
            lat: custLat,
            lng: custLng
        }
    };
}

export interface AccuratePositionResult {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    isHighAccuracy: boolean;
}

/**
 * Enhanced High-Precision Geolocation Acquisition
 * Progressively hones satellite accuracy:
 * 1. Takes immediate cached/fresh reading for zero perceived delay.
 * 2. If initial reading is coarse (> 25m), streams watchPosition updates for up to 5 seconds
 *    or until accuracy reaches <= 15m.
 * 3. Smoothly invokes onProgress with better readings so UI pins auto-snap to true rooftop level.
 */
export async function getAccurateLivePosition(
    onProgress?: (result: AccuratePositionResult) => void,
    options?: { timeoutMs?: number; targetAccuracy?: number; maxAcceptableAccuracy?: number }
): Promise<AccuratePositionResult> {
    const timeoutMs = options?.timeoutMs || 9000;
    const targetAccuracy = options?.targetAccuracy || 15; // 15 meters target
    const maxAcceptableAccuracy = options?.maxAcceptableAccuracy || 40; // 40m max for high-confidence lock

    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            return reject(new Error('Geolocation not supported by device.'));
        }

        let bestResult: AccuratePositionResult | null = null;
        let watchId: number | null = null;
        let isResolved = false;

        const cleanup = () => {
            if (watchId !== null) {
                safeClearWatch(watchId);
                watchId = null;
            }
        };

        const finish = () => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            if (bestResult) {
                resolve(bestResult);
            } else {
                reject(new Error('Unable to obtain geolocation lock.'));
            }
        };

        // Safety timeout
        const timer = setTimeout(finish, timeoutMs);

        const handleCoords = (pos: GeolocationPosition) => {
            const { latitude, longitude, accuracy, altitude } = pos.coords;
            const current: AccuratePositionResult = {
                latitude,
                longitude,
                accuracy,
                altitude,
                isHighAccuracy: accuracy <= 35
            };

            // If we don't have a reading or this reading has lower uncertainty (better accuracy)
            if (!bestResult || accuracy < bestResult.accuracy) {
                bestResult = current;
                onProgress?.(current);
            }

            // If accuracy reached target pinpoint precision (<= 15m), lock immediately
            if (accuracy <= targetAccuracy) {
                clearTimeout(timer);
                finish();
            }
        };

        // 1. Initial quick grab (high accuracy requested)
        safeGetCurrentPosition(
            (pos) => {
                handleCoords(pos);
                // Only finish early if already at or below target accuracy
                if (pos.coords.accuracy <= targetAccuracy) {
                    clearTimeout(timer);
                    finish();
                    return;
                }

                // 2. Stream watchPosition with high accuracy to refine satellite fix
                safeWatchPosition(
                    handleCoords,
                    () => { finish(); },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
                ).then(id => {
                    watchId = id;
                });
            },
            (err) => {
                // Fallback attempt
                safeGetCurrentPosition(
                    (pos) => {
                        handleCoords(pos);
                        finish();
                    },
                    (fallbackErr) => {
                        clearTimeout(timer);
                        cleanup();
                        reject(fallbackErr || err);
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}

/**
 * Reverse-geocodes lat/lng into a clean human-readable address with in-memory caching.
 */
const geocodeCache = new Map<string, string>();

export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (geocodeCache.has(key)) {
        return geocodeCache.get(key)!;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const data = await res.json();
        
        let formatted = '';
        if (data && data.display_name) {
            formatted = data.display_name;
        } else if (data && data.address) {
            const a = data.address;
            const parts = [
                a.road || a.pedestrian || a.suburb,
                a.neighbourhood || a.village || a.city_district,
                a.city || a.municipality || a.town,
                a.state || a.province
            ].filter(Boolean);
            formatted = parts.join(', ');
        }

        if (!formatted) {
            formatted = `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        }

        geocodeCache.set(key, formatted);
        return formatted;
    } catch (_) {
        return `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    }
}



