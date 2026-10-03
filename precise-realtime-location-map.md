# Precise Realtime Map & Live Location (Customer + Mechanic)

## Goal
Make every live map in the app realtime and make the customer's and mechanic's positions
**precise and consistent everywhere** — starting from the Confirm Service Location screen
(screenshot: `REFINING GPS ACCURACY... ±143m` that never converged).

---

## Root causes found

1. **Only the *initial* lock was precision-managed.** The long-lived watchers that actually
   feed Firestore/RTDB used raw `navigator.geolocation.watchPosition` with no quality
   gating, so a coarse ±140m cell-tower reading could overwrite a good satellite fix and
   get broadcast to every tracking map.
2. **Native (Capacitor) GPS was used inconsistently.** Some call sites had hand-rolled
   native→web fallbacks (3 near-identical copies), others were web-only — on Android the
   WebView often returns network fixes while the hardware GPS was never consulted.
3. **Accuracy HUD could not recover.** Once a coarse reading set the pill, nothing retried
   the satellite hone, so the pill sat on "REFINING GPS ACCURACY… ±143m" forever with no
   honest fallback advice.
4. **Fake movement.** `HomeLiveMap` jittered mechanic pins randomly every 2s regardless of
   real data — the opposite of realtime.
5. **Route lines went stale.** `LiveRouteMapModal` fetched the OSRM route once on open and
   never again while both parties kept moving.

---

## What changed

### `utils/locationHelper.ts` — one precision engine for the whole app
- `isNativePlatform()` + **native-first** `safeGetCurrentPosition` / `safeWatchPosition`
  (Capacitor hardware GPS on Android/iOS, WebView API as fallback).
- Native watches are registered under **synthetic numeric handles**, so every existing
  `number | null` handle + `safeClearWatch(id)` call site keeps working unchanged.
- **`startPreciseWatch(onFix, onError, options)`** — the unified live stream:
  - drops degraded network readings (worse than `best × 2` and `> 35m`) unless stale
  - stationary deadband (default 1.5 m) so pins don't shimmer
  - auto-hones whenever accuracy improves by > 5 m
  - stale safety valve (default 15 s) so a moving user never freezes on the map
  - reports `{ lat, lng, accuracy, bestAccuracy, timestamp, isHighAccuracy }`
- `distanceMeters()` haversine helper exported for reuse.

### `pages/BookingScreen.tsx` — Confirm Service Location
- Single `applyLocationFix()` shared by the initial lock, the realtime stream, the
  auto-refine retries and the recenter button (identical accuracy/position semantics).
- Accuracy HUD tracks **best-so-far** and never regresses from a good lock.
- **Auto-refine loop**: re-runs the satellite hone every 12 s until ≤ 25 m is achieved.
- **Honest stalled state**: after 20 s without a satellite lock the pill switches to
  `LOCATION APPROXIMATE — drag pin to fine-tune` instead of spinning forever.
- The GPS watch no longer tears down/restarts when the user toggles manual-pin mode.
- **Nearby mechanics**: live Firestore `db.mechanics` stream rendered as branded pins
  (online + available, within 25 km, top 12, distance-sorted) plus a
  `N MECHANICS NEARBY / nearest …` badge. Origin is quantized (~11 m) so dragging the pin
  doesn't rebuild markers every pointer frame.

### Realtime feeds — same engine on both sides
- `App.tsx`: customer tracker (En Route) and mechanic tracker (En Route → RTDB + Firestore)
  now use `startPreciseWatch`; ~90 lines of duplicated native/web fallback removed.
- `pages/BookingDetailScreen.tsx`: customer → `tracking/{id}/customerLocation` writer.
- `pages/mechanic/MechanicJobDetailScreen.tsx`: mechanic → `tracking/{id}/mechanicLocation`
  + Firestore `mechanicLocation` writer.
- `pages/RentCarScreen.tsx`, `pages/services/DriverBookingFlow.tsx` (×2),
  `pages/services/LiaisonBookingFlow.tsx`: confirm-location streams converted.

### Maps
- `components/HomeLiveMap.tsx`: removed the random-jitter "simulate movement" timer —
  pins now move only from real Firestore updates; customer pin skips sub-meter noise.
- `components/LiveRouteMapModal.tsx`: markers already synced live; the **route line now
  refetches** when either endpoint moves ~110 m, throttled (≥ 8 s between OSRM calls,
  debounced 1.2 s, out-of-order responses discarded) and **without** snapping the view the
  user had panned.

---

## Verification
- `npx tsc --noEmit` → exit 0
- `npm run build` → `✓ built in 18.14s`
- Dev server boots and the app renders with **no console errors**.

## Data paths (unchanged, for reference)
- Customer: `customers/{id}.lat,lng` (Firestore) and `tracking/{bookingId}/customerLocation` (RTDB)
- Mechanic: `mechanics/{id}.lat,lng` (Firestore, drives all discovery maps) and
  `tracking/{bookingId}/mechanicLocation` (RTDB, low-latency tracking)
- Booking creation writes the initial `tracking/{bookingId}/customerLocation` snapshot.
