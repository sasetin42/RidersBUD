# Driver for Hire: Realtime Location Confirmation Step

## Goal
Add an interactive "Confirm Realtime Location" map step right after Driver Selection in the Driver for Hire flow, before entering Trip Details, matching the exact look and functionality of the main services and Rent-a-car location confirmation map.

---

## Analysis & Current vs Required Flow

### Current Flow:
1. User browses Drivers in `HireDriverScreen.tsx` (`/customer-portal/app-services/driver-book`).
2. User clicks "Book with [Driver]" (or selects a package).
3. The app immediately navigates to `DriverBookingFlow.tsx` at Step 1: "Trip & Vehicle Details" (Form with pickup/destination text inputs, date/time, vehicle info).
4. Step 2: Payment & Breakdown.

### Required Flow:
1. User selects a driver in `HireDriverScreen.tsx`.
2. **Next Step**: **Confirm Realtime Location** interactive map (Leaflet full-bleed map with RidersBUD orange branded pin, high-accuracy GPS lock badge, satellite calibration pill, zoom +/- controls, GPS recenter button with ping radar animation, reverse geocoded address pill, and "CONFIRM LOCATION ✓" button).
3. **Trip Details**: Pick-Up Location and GPS coordinates are pre-populated and locked from the confirmed realtime location. The user then selects destination, schedule/time, vehicle, and purpose.
4. **Summary & Payment**: HitPay / GCash payment with full location data attached to the booking.

---

## Unified Implementation Strategy

We will support both entry paths seamlessly:
1. **Flow Wizard in `DriverBookingFlow.tsx` (3 Steps)**:
   - **Step 1: Confirm Realtime Location**:
     - Displays full interactive Leaflet map matching `media_1790031061662.png`.
     - Shows "Confirm Service Location / Your driver will be dispatched here."
     - Live GPS tracking with `getAccurateLivePosition` and `safeWatchPosition`.
     - Draggable RidersBUD branded pin (`.rb-location-pin-wrapper` with stem, dot, app logo).
     - Accurate calibration badge ("LIVE GPS ACTIVE / Accurate to ±Xm" or "REFINING GPS ACCURACY...").
     - Recenter button, zoom controls.
     - Resolved address card at bottom.
     - Prominent "CONFIRM LOCATION ✓" CTA button that transitions to Step 2.
   - **Step 2: Trip & Vehicle Details**:
     - Pre-fills Pick-Up Location with the confirmed street address & coordinates (`startCoords`).
     - Allows entering destination, date/time, vehicle, and purpose.
     - Bottom "Next Step" navigates to Step 3.
   - **Step 3: Summary & Payment**:
     - Review details, calculate breakdown, select HitPay or GCash, and submit booking.
   - Stepper header updated to: `Flow Wizard • Step {currentStep} of 3` with 3 progress bars.

2. **Direct Selection in `HireDriverScreen.tsx`**:
   - When user clicks "Book with [Driver]" on driver card:
     - Open `HireDriverLocationModal` (full-bleed realtime location confirmation modal matching Rent a Car's `RentCarLocationModal`), OR navigate directly into `DriverBookingFlow` with `currentStep = 1` (Confirm Location).
     - To ensure maximum consistency with `RentCarScreen.tsx` (which presents `RentCarLocationModal` immediately upon tapping "Rent Now" and then passes location into booking), we can also provide the instant full-screen location modal directly in `HireDriverScreen.tsx` that seamlessly transitions to `DriverBookingFlow` with `lat`, `lng`, and `pickupAddress` passed in URL parameters!
     - Furthermore, `DriverBookingFlow` itself will have Step 1 as Confirm Location if not pre-confirmed, or display the confirmed location and let users review/change it on the map.

---

## Tasks Breakdown

- [ ] Task 1: Update `DriverBookingFlow.tsx` Stepper Architecture to 3 Steps
  - Step 1: Realtime Location Confirmation (Leaflet map with RidersBUD pin, GPS accuracy pill, zoom & recenter controls, resolved address card, "CONFIRM LOCATION" button).
  - Step 2: Trip Details (Pre-filled pickup location from Step 1, destination, date/time, vehicle, purpose).
  - Step 3: Payment & Summary (HitPay / GCash).
  - Read query params `lat`, `lng`, `pickupAddress` if passed from `HireDriverScreen`.

- [ ] Task 2: Enhance `HireDriverScreen.tsx` Driver Selection
  - When tapping "Book with [Driver]" or selecting a package, open `HireDriverLocationModal` with driver details chip.
  - Upon clicking "CONFIRM LOCATION", navigate to `/customer-portal/app-services/driver-book/driver-for-hire?driverId=...&lat=...&lng=...&pickupAddress=...`.

- [ ] Task 3: Verify & Test
  - Run `npm run build` to ensure zero compilation errors and compliance with React Hooks rules.
  - Verify UI against `media_1790031061662.png` and `media_1790030985193.png`.
