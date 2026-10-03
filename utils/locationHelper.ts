import { Capacitor } from '@capacitor/core';
import { Geolocation as NativeGeolocation } from '@capacitor/geolocation';

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
 * True when running inside the packaged Android/iOS app (Capacitor native runtime).
 * Native builds talk directly to the OS location stack (GPS satellite fixes)
 * instead of the WebView's often-coarse network fallback.
 */
export function isNativePlatform(): boolean {
    try {
        return typeof window !== 'undefined' &&
            typeof (window as any).Capacitor !== 'undefined' &&
            typeof (window as any).Capacitor.isNativePlatform === 'function' &&
            (window as any).Capacitor.isNativePlatform() === true;
    } catch (_) {
        return false;
    }
}

function toNativeOptions(options?: PositionOptions) {
    return {
        enableHighAccuracy: options?.enableHighAccuracy !== false,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0
    };
}

function geoError(code: 1 | 2 | 3, message: string): GeolocationPositionError {
    return {
        code,
        message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
    } as GeolocationPositionError;
}

/**
 * Safe wrapper around navigator.geolocation.getCurrentPosition.
 * Prefers the native (Capacitor) location stack on Android/iOS for hardware GPS
 * precision, then falls back to the browser API.
 * Will NOT invoke navigator.geolocation if permission is denied,
 * preventing the Chrome browser-level blocked prompt console warning.
 */
export async function safeGetCurrentPosition(
    onSuccess: PositionCallback,
    onError?: PositionErrorCallback,
    options?: PositionOptions
): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        onError?.(geoError(2, 'Geolocation is not supported by your browser/device.'));
        return;
    }

    const isDenied = await isGeolocationPermissionDenied();
    if (isDenied) {
        onError?.(geoError(1, 'Geolocation permission has been blocked or denied.'));
        return;
    }

    // 1) Native hardware GPS (Android / iOS) — precise satellite fixes
    if (Capacitor.isNativePlatform()) {
        try {
            const position = await NativeGeolocation.getCurrentPosition(toNativeOptions(options));
            if (position && position.coords) {
                onSuccess(position as unknown as GeolocationPosition);
                return;
            }
        } catch (_) {
            // Fall through to the WebView implementation
        }
    }

    // 2) Browser geolocation
    try {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    } catch (_) {
        onError?.(geoError(1, 'Unable to access geolocation.'));
    }
}

/**
 * Native (Capacitor) watches return string ids while the web API returns numbers.
 * We hand out synthetic negative numbers for native watches so every caller in the
 * app can keep using a single `number | null` handle with `safeClearWatch`.
 */
const nativeWatchRegistry = new Map<number, string>();
let nextNativeHandle = -1;

/**
 * Safe wrapper around navigator.geolocation.watchPosition (or the native plugin).
 * Prefers the native hardware GPS stream on Android/iOS.
 * Returns a numeric handle immediately usable with safeClearWatch; null if denied.
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
        onError?.(geoError(1, 'Geolocation permission is denied.'));
        return null;
    }

    // 1) Native hardware GPS stream (Android / iOS)
    if (Capacitor.isNativePlatform()) {
        try {
            const nativeId = await NativeGeolocation.watchPosition(
                toNativeOptions(options),
                (position: any) => {
                    if (position && position.coords) onSuccess(position as GeolocationPosition);
                }
            );
            const handle = nextNativeHandle--;
            nativeWatchRegistry.set(handle, nativeId);
            return handle;
        } catch (_) {
            // Fall through to the WebView stream
        }
    }

    // 2) Browser watch stream
    try {
        return navigator.geolocation.watchPosition(onSuccess, onError, options);
    } catch (_) {
        return null;
    }
}

/**
 * Safe wrapper around navigator.geolocation.clearWatch / native clearWatch.
 * Accepts any handle produced by safeWatchPosition (web ids or synthetic native ids).
 */
export function safeClearWatch(watchId: number | null): void {
    if (watchId === null || typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
        return;
    }

    if (watchId < 0 && nativeWatchRegistry.has(watchId)) {
        const nativeId = nativeWatchRegistry.get(watchId)!;
        nativeWatchRegistry.delete(watchId);
        try {
            NativeGeolocation.clearWatch({ id: nativeId }).catch(() => {});
        } catch (_) {}
        return;
    }

    try {
        navigator.geolocation.clearWatch(watchId);
    } catch (_) {}
}

/**
 * Great-circle distance in meters between two coordinate pairs.
 */
export function distanceMeters(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
): number {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface PreciseFix {
    lat: number;
    lng: number;
    /** Accuracy radius of this fix in meters. */
    accuracy: number;
    /** Best (lowest) accuracy this watcher has seen, in meters. */
    bestAccuracy: number;
    timestamp: number;
    isHighAccuracy: boolean;
}

export interface PreciseWatchOptions extends PositionOptions {
    /** Stationary sensor-noise deadband in meters (default 1.5). */
    minMoveMeters?: number;
    /** Force-emit a fix after this many ms without one so maps never go stale (default 15000). */
    staleAfterMs?: number;
}

/**
 * Unified high-accuracy live position stream used by EVERY live map in the app so
 * customer and mechanic positions behave identically everywhere:
 *
 *  - Native hardware GPS first (Android/iOS), browser stream as fallback
 *  - Drops degraded network readings (far worse than the best fix seen) so a
 *    ±140m cell-tower reading never yanks a pinpoint pin backwards
 *  - Stationary deadband: ignores sub-2m jitter so pins don't shimmer
 *  - Auto-hones: still emits whenever accuracy improves by >5m
 *  - Stale safety valve: emits anyway after `staleAfterMs` so a moving user never freezes
 */
export async function startPreciseWatch(
    onFix: (fix: PreciseFix) => void,
    onError?: PositionErrorCallback,
    options?: PreciseWatchOptions
): Promise<number | null> {
    const minMove = options?.minMoveMeters ?? 1.5;
    const staleAfter = options?.staleAfterMs ?? 15000;

    let bestAccuracy: number | null = null;
    let lastAccepted: { lat: number; lng: number } | null = null;
    let lastAcceptedAt = 0;

    return safeWatchPosition((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isFinite(latitude) || !isFinite(longitude) || !(accuracy >= 0) || accuracy > 5000) return;

        const now = Date.now();
        const prevBest = bestAccuracy;
        const improved = prevBest === null || accuracy < prevBest - 5;
        if (prevBest === null || accuracy < prevBest) bestAccuracy = accuracy;

        // Degraded coarse reading while we hold a much better fix — drop unless stale
        if (
            prevBest !== null &&
            accuracy > prevBest * 2 &&
            accuracy > 35 &&
            lastAcceptedAt > 0 &&
            now - lastAcceptedAt < staleAfter
        ) {
            return;
        }

        const moved = lastAccepted ? distanceMeters(lastAccepted, { lat: latitude, lng: longitude }) : Infinity;
        const stale = lastAcceptedAt === 0 || now - lastAcceptedAt >= staleAfter;
        if (!stale && !improved && moved < minMove) return;

        lastAccepted = { lat: latitude, lng: longitude };
        lastAcceptedAt = now;

        onFix({
            lat: latitude,
            lng: longitude,
            accuracy,
            bestAccuracy: bestAccuracy as number,
            timestamp: position.timestamp || now,
            isHighAccuracy: accuracy <= 35
        });
    }, onError, options);
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



