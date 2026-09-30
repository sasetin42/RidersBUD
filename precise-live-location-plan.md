# Plan: Precise Realtime & Live Location Optimization Across All Services

## Goal
Completely resolve the location discrepancy between coarse initial network coordinates (Attachment 1) and true real-time GPS coordinates (Attachment 2) by implementing high-accuracy GPS auto-refinement, fixing Leaflet pin marker geometric anchoring, and applying real-time live location tracking consistently across all existing and future services (Vehicle Maintenance/Booking, Car Rental, Driver for Hire, Towing, Liaison Assistance, and E-Commerce Store Logistics).

---

## Technical Findings & Root-Cause Analysis

1. **Pin Anchor & Leaflet Offset**:
   - In `index.css`, `.rb-location-pin-wrapper` has `width: 56px; height: 76px;`.
   - Leaflet marker was configured with `iconSize: [56, 76]`, `iconAnchor: [28, 76]`.
   - However, the circle (44px) + stem (22px) + dot (8px) minus negative margins resulted in an effective visual height of 61px, leaving a 15px vertical air gap between the visible dot tip and the registered geographic coordinates.
   - When manually dragged, the user aligns the visible dot with their rooftop; but when set by GPS coordinates, Leaflet placed the bottom anchor 15px below the actual dot, making the location appear shifted onto the adjacent street!

2. **GPS Initial Jitter & Coarse Cache**:
   - Browsers/mobile devices frequently emit an initial cached or cell-tower Wi-Fi location (accuracy ±100m to ±150m) on the first callback of `getCurrentPosition`.
   - The app accepted this first sample immediately without waiting for hardware GPS satellite stabilization.
   - **Fix**: Implement progressive auto-hone: accept initial reading for instant responsiveness, but continuously refine the location as satellite accuracy improves (accuracy <= 15m) without triggering map re-centering jitter if the user has touched/dragged the map.

3. **Service Uniformity**:
   - `BookingScreen.tsx`: Needs calibrated pin geometry + progressive multi-sample GPS stabilization.
   - `RentCarScreen.tsx` & `DriverBookingFlow.tsx`: Must provide real-time GPS location detection with exact coordinate resolution, auto-populating pickup/service coordinates and displaying on the route map.
   - `LiaisonBookingFlow.tsx`: Add 1-tap "Use Live GPS" for document retrieval pickup address.
   - `locationHelper.ts`: Provide `getAccurateLivePosition()` and `resolveOrderTrackingLocations()` ensuring both customer delivery pin and store origin pin have exact GPS coordinates with zero hardcoded offsets.

---

## Tasks

### Phase 1: Core GPS Engine & Marker Geometry Alignment
- [x] **Task 1: Calibrate Pin Marker Geometry & Leaflet Anchor in `index.css` & Map Markers**
  - Adjust `.rb-location-pin-wrapper`, `.rb-location-stem`, and `.rb-location-dot` so the marker tip is mathematically aligned to exact [lat, lng] coordinates with 0px offset error.
  - Update `iconSize` and `iconAnchor` in `BookingScreen.tsx`, `DriverBookingFlow.tsx`, and all Leaflet icon definitions.

- [x] **Task 2: Build Enhanced High-Precision Geolocation Utility in `utils/locationHelper.ts`**
  - Implement `getAccurateLivePosition()`: Progressive multi-sample satellite lock (captures immediate position, tracks updates until accuracy <= 15m or 3 stabilized samples, filters out satellite jitter).
  - Add reverse-geocoding caching with robust address resolution.

### Phase 2: Apply to Main Booking Screen (Mechanics & Services)
- [x] **Task 3: Upgrade `BookingScreen.tsx` Location Confirmation Step**
  - Implement the calibrated high-precision GPS pipeline.
  - Ensure instant display + smooth auto-hone to true building/rooftop position.
  - Fix recenter button and manual drag persistence.

### Phase 3: Apply to Car Rental, Driver for Hire, Towing, and Liaison Services
- [x] **Task 4: Upgrade `DriverBookingFlow.tsx` & `BookingScreen.tsx` (Special Rental & Driver flows)**
  - Ensure "Live GPS" button utilizes `getAccurateLivePosition()` for precise pickup address + exact start coordinates.
  - Ensure route preview map accurately plots pickup at true coordinates.

- [x] **Task 5: Upgrade `LiaisonBookingFlow.tsx` (Document Pickup Location)**
  - Add "Use Live Location (GPS)" button to the Home/Office document pickup address field in Step 7.
  - Auto-populate full reverse-geocoded address and record coordinates.

- [x] **Task 6: Upgrade E-Commerce Store Logistics in `locationHelper.ts` & Checkout Flows**
  - Ensure customer delivery location uses precise hardware coordinates when placing parts orders.
  - Verify store origin pin coordinates dynamically load from Admin System Settings (`storeLatitude`, `storeLongitude`).

### Phase 4: Verification & Audit
- [x] **Task 7: Automated Compilation & Build Verification**
  - Run `npm run build` to guarantee type safety and zero regressions across all services.

---

## Done When
- [x] Pin marker tip points directly to true building/street coordinates without the vertical/horizontal discrepancy.
- [x] Live GPS automatically locks onto true location (Attachment 2 accuracy) rather than coarse initial cell network reading (Attachment 1).
- [x] All services (Vehicle Repair, Car Rental, Driver for Hire, Towing, Liaison, and E-Commerce) have unified precise real-time live location detection.
- [x] `npm run build` exits with code 0.
