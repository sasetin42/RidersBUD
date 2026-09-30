# Plan: Enhance Real-Time Live Location & Remove Radius Background

## Goal
Optimize and smooth out real-time live location tracking across the app, ensure continuous GPS stream without glitches, and cleanly eliminate the dashed orange accuracy circle/radius background design on maps (as shown in the user's screenshot).

---

## Technical Context & Findings
1. **Dashed Orange Radius Circle (`customerAccuracyCircleRef` / `accuracyCircleRef`)**:
   - In `components/HomeLiveMap.tsx` (lines 268–281): An `L.circle` with `#FE7803`, `dashArray: '4, 4'`, and `fillOpacity: 0.14` was drawn around the user location (`customerAccuracyCircleRef`). [REMOVED]
   - In `pages/BookingScreen.tsx` (lines 1082–1091, 1172–1186): An `L.circle` with `#FE7803`, `dashArray: '4, 4'`, and `fillOpacity: 0.15` was rendered (`accuracyCircleRef`). [REMOVED]

2. **Real-time Live Location Tracking Optimization**:
   - **Smooth Continuous Position Updates**: `safeWatchPosition` in `locationHelper.ts` runs with high accuracy stream.
   - **Prevent Jitter & Map Snapping**: Implemented a distance delta threshold (< 1.5m) to filter out stationary GPS noise and jitter.
   - **Camera Glide**: Replaced abrupt `setView` snapping with gentle animated `panTo` (`duration: 0.6`, `easeLinearity: 0.25`) for continuous fluid movement.
   - **Live GPS Accuracy Pill**: Clean HUD pill remains visible and updates continuously (`Accurate to ±Xm`), free of any background map canvas circle distortion.

---

## Tasks

### Phase 1: Planning & Design Cleanup (Frontend)
- [x] **Task 1: Remove Map Radius Circles**
  - In `components/HomeLiveMap.tsx`: Removed `customerAccuracyCircleRef` circle creation and updates. Cleaned up existing references.
  - In `pages/BookingScreen.tsx`: Removed `accuracyCircleRef` creation, update, and cleanup.
  - Verified maps show clean pin marker without any orange bounding circle or dashed perimeter.

### Phase 2: Live Location Smoothing & Watch Optimization (Core)
- [x] **Task 2: Optimize Geolocation Streaming & Precision in `locationHelper.ts` & `BookingScreen.tsx`**
  - Implemented minimum movement delta threshold (deadband filter ~1.5m) to eliminate static GPS noise/jitter.
  - Retained `isTrackingLive` smooth camera follow (`panTo` with smooth transition duration).
- [x] **Task 3: Optimize `HomeLiveMap.tsx` Real-time Marker Updating**
  - Customer location and mechanic live positions update smoothly without circle artifacts.

### Phase 3: Verification & Auditing
- [x] **Task 4: Run Code Verification & Lint**
  - Executed `npm run build` — compiled cleanly with exit code 0 (`built in 16.99s`).

---

## Done When
- [x] Dashed circular radius/accuracy background is completely removed from both Home live map and Booking confirmation map.
- [x] Live GPS tracking continuously and smoothly updates the user's position without map stutter or jitter.
- [x] Manual pin drag and drop retains 100% responsiveness without any circle artifacts.
