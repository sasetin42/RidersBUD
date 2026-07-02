# Plan: Car Rent and Driver Hire Sync

## Overview
This plan connects the customer-side **Rent a Car** and **Hire a Driver** selection steps in the booking workflow with live Firestore data managed by the admin catalog. Currently, the booking workflow uses hardcoded client-side arrays (`mockCars` and `mockDrivers`).

## Success Criteria
- [x] No static mock arrays for cars/drivers in `BookingScreen.tsx`.
- [x] Real-time updates: when an admin edits a car/driver in the catalog, it reflects instantly on the customer-side selection screen.
- [x] Correct pricing calculations based on database price fields.
- [x] Real-time availability counts synced with `isAvailable` status in headers and badges.
- [x] Interactive Route Map (Leaflet) and Geolocation Picker implemented and functional.
- [x] Verification script and build compile successfully.

## Proposed Changes
- Modify [BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx) to query `db.rentalCars` and `db.hireDrivers`.
- Modify [firestore.rules](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/firestore.rules) to add public read access for `hireDrivers`.
- Modify [index.html](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/index.html) to inject Leaflet.
- Embed interactive route map preview in [BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx) step 4.

## Tasks
1. **P1 (Core): Integrate live arrays in BookingScreen**
   - Agent: `frontend-specialist`
   - Skill: `clean-code`
   - Input: `BookingScreen.tsx` using mock arrays.
   - Output: `BookingScreen.tsx` subscribing to `db.rentalCars` and `db.hireDrivers`.
   - Verify: Check that lists load and reflect changes immediately.

2. **P2 (Polish): Filter counts based on active availability**
   - Agent: `frontend-specialist`
   - Skill: `clean-code`
   - Input: BookingScreen displaying overall lengths.
   - Output: BookingScreen counting only available items (`isAvailable !== false`).
   - Verify: Check top-right available count badge and header counts.

3. **P3 (Security): Deploy Firestore rules**
   - Agent: `devops-engineer`
   - Skill: `deployment-procedures`
   - Input: Modified `firestore.rules`.
   - Output: Rules deployed successfully to Firebase.
   - Verify: Run `firebase deploy --only firestore:rules`.

4. **P4 (Map): Leaflet map & Live GPS Geolocation**
   - Agent: `frontend-specialist`
   - Skill: `frontend-design`
   - Input: Static route inputs screen.
   - Output: Geolocation reverse-geocoding picker + live route polyline map.
   - Verify: Run geolocator to get location and verify map pins redraw.

5. **P5 (Verification): Build and run checks**
   - Agent: `test-engineer`
   - Skill: `testing-patterns`
   - Input: Modified source code.
   - Output: Compiled production build without errors.
   - Verify: Run `npm run build` and lint checks.

## ✅ PHASE X COMPLETE
- Rules: ✅ Firestore rules deployed
- Map: ✅ Leaflet route preview map & Geolocation fully functional
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-30
