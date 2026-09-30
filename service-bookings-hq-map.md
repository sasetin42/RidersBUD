# Service Bookings Default HQ Realtime & Live Map Integration Plan

> **Scope**: Ensure that for **Driver for Hire**, **Car Rental**, **Liaison**, and **Towing**, the system by default adopts and displays the **Headquarters (HQ) realtime and live MAP location** (Carmona Commercial Center or configured store address in settings) alongside the Client/Customer's selected realtime booking location. In the backend/admin map display and customer tracking modals, display both the default HQ and the Client location with live routing.

---

## 1. Problem & Architecture Overview

- **HQ Location Source of Truth**:
  - `db.settings.storeLatitude`, `db.settings.storeLongitude`, `db.settings.storeAddress`, `db.settings.storeName` with fallback to `RIDERSBUD_STORE_LOCATION` (`14.3149, 121.0583, Carmona Commercial Center`).
- **Target Services**:
  1. **Driver for Hire** (`isDriverHire` / `Driver for Hire` / `DRV-*`)
  2. **Car Rental** (`isRental` / `Car Rental` / `rentalBookings`)
  3. **Liaison** (`Liaison` / `liaisonBookings` / Document assistance)
  4. **Towing** (`Towing` / Emergency towing service)
- **Current Behavior**:
  - In `AdminBookingsScreen.tsx` (`BookingLocationModal` & `LiveMapCard`):
    - Car Rental suppressed the 2nd marker or only showed customer.
    - Towing, Liaison, and Driver for Hire without assigned mechanics drifted around the customer or lacked clear HQ origin dispatch hub representation.
  - In `LiveRouteMapModal.tsx`:
    - Treated origin as mechanic or store order hub only.
  - In `BookingDetailScreen.tsx`:
    - Did not pass HQ location fallback when mechanic was unassigned for these specialized services.

---

## 2. Proposed Implementation Steps

### Step 1: `components/LiveRouteMapModal.tsx`
- Add support for HQ origin when mechanic is unassigned or service originates from Headquarters (Car Rental, Towing, Liaison, Driver for Hire dispatch).
- Add `hqLocation?: { lat: number; lng: number; name?: string; address?: string }` prop.
- If `mechanicLocation` is not set and service is one of the HQ-origin services, use `hqLocation` as origin with a custom RidersBUD HQ / Hub marker and badge.
- Render routing polyline from HQ to Customer location.

### Step 2: `pages/admin/AdminBookingsScreen.tsx`
- In `BookingLocationModal`:
  - Detect whether booking is one of `{ Car Rental, Driver for Hire, Liaison, Towing }`.
  - Resolve HQ Location from `db.settings` or `RIDERSBUD_STORE_LOCATION`.
  - When mechanic/driver is not yet assigned/live, default Origin to HQ Location (Carmona Commercial Center) and Destination/Pickup to Customer Location.
  - Render both markers (HQ Dispatch Hub + Customer Realtime Location) with connecting driving route polyline, distance (km), and ETA.
  - Enable toggling between HQ view, Customer view, or Both.
- In `LiveMapCard`:
  - Mirror the same logic so the embedded live preview card in the bookings table shows HQ and Customer.

### Step 3: `pages/BookingDetailScreen.tsx`
- Pass `hqLocation` into `LiveRouteMapModal` using `db.settings` with `RIDERSBUD_STORE_LOCATION` fallback.
- In the embedded `MiniMap` section, for Driver for Hire, Car Rental, Liaison, and Towing, display route from HQ to Customer pickup address.

### Step 4: Verification
- Run `npm run build` to verify TypeScript compile and bundling.
- Validate marker coordinates, fallback handling, and responsive display.
