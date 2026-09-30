# Liaison Services Real-Time Live Location Map & Modern Pickup Option Button

## Goal
Transform the "Pickup Option" section under "Address & Pickup Details" in the Liaison services tab of the Backend Admin Panel (`AdminBookingsScreen.tsx`) into a modern, interactive card/button with live GPS indicator that triggers the full-screen `BookingLocationModal` map displaying both Customer/Client location and RidersBUD Central HQ live location, exactly matching Car Rental and Driver for Hire. Additionally, display an embedded interactive `LiveMapCard` for Liaison bookings.

## Architecture & Data Flow
1. **Frontend UI Integration (`AdminBookingsScreen.tsx`)**:
   - In the Liaison tab expanded row under "Address & Pickup Details":
     - Redesign the "Pickup Option" card into a clickable, modern luxury card with interactive hover styling, pulsing live GPS badge, and an actionable "Open Live Map" trigger.
     - Add an interactive embedded `LiveMapCard` container with a prominent "Click to View Live Details" overlay, or elevate the Pickup Option card with an interactive map preview button.
     - Provide full support in `BookingLocationModal` for Liaison bookings:
       - Client pin (electric blue) with accurate customer coordinates (from `booking.location`, `customer.lat/lng`, or branch coordinates).
       - RidersBUD HQ pin (orange hub) with live telemetry (distance in km, estimated travel time via OSRM road route or geodesic calculation).
       - Toggle tabs ("Both", "Liaison", "Client").
       - Detailed transaction pane with LTO service breakdown, payment breakdown, customer profile with chat button, and assigned liaison officer info.
2. **Payload Coordination (`LiaisonBookingFlow.tsx`)**:
   - Ensure `bookingPayload` saves `location: { lat, lng, latitude, longitude, address }` when customer confirms location or selects a branch, ensuring `db.liaisonBookings` records possess high-precision coordinates for live mapping.
3. **Mobile & Tablet Responsiveness**:
   - In the mobile expanded view of `AdminBookingsScreen.tsx`, ensure the real-time map card is enabled for the Liaison tab with touch optimization.

## Tasks
- [ ] Task 1: In `pages/services/LiaisonBookingFlow.tsx`, add `location` and `pickupLocationCoords` with latitude and longitude into `bookingPayload` so all new liaison bookings store geographic coordinates. → Verify: Inspect payload structure.
- [ ] Task 2: In `pages/admin/AdminBookingsScreen.tsx` bookings memo for `activeAdminTab === 'Liaison'`, extract coordinates from `(b as any).location`, `(b as any).pickupLocationCoords`, customer coordinates, or fallback branch coordinates. → Verify: Bookings objects have valid `location.lat` and `location.lng`.
- [ ] Task 3: In `pages/admin/AdminBookingsScreen.tsx`, redesign the Pickup Option section in the Liaison tab card into a modern interactive element with pulsing live badge and onClick handler triggering `setViewingMapBooking(booking)`. → Verify: Clicking the button opens `BookingLocationModal`.
- [ ] Task 4: In `pages/admin/AdminBookingsScreen.tsx`, integrate an embedded `LiveMapCard` in the Liaison section matching Car Rental and Driver for hire cards, and enable it on the mobile view. → Verify: Live mini map renders with customer and HQ pins.
- [ ] Task 5: In `BookingLocationModal` inside `AdminBookingsScreen.tsx`, customize labels and cards for Liaison (`Liaison Officer`, `LTO Processing Center`, `Customer Brings Documents` / `Door Pickup`). → Verify: Modal header and telemetry display Liaison specifics.
- [ ] Task 6: Compile and build verification via `npm run build`. → Verify: Build completes cleanly with exit code 0.

## Done When
- [ ] The "Pickup Option" in Liaison services features a modern button/card that opens the full real-time live map modal.
- [ ] The map displays both the Customer/Client pin and RidersBUD Central HQ pin with live route, distance, and ETA.
- [ ] Leaflet pins, markers, and view switcher ("Both", "Liaison", "Client") function seamlessly identical to Car Rental and Driver for Hire.
- [ ] Build succeeds with 0 TypeScript/compilation errors.
