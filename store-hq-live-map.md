# HQ / Store Address with Realtime & Live Map Location

## Goal
Add an interactive realtime and live map location picker to the HQ / Store Physical Address field in Admin Settings with GPS detection, pin dragging, address geocoding, and default Carmona Commercial Center support.

## Tasks
- [x] Task 1: Add reverse geocoding & coordinate synchronization helper in `utils/locationHelper.ts` → Verify: Functions return coordinates and formatted address
- [x] Task 2: Update `components/admin/settings/tabs/GeneralSettingsTab.tsx` with live Leaflet map preview, draggable marker, GPS detector, and quick Carmona reset → Verify: Map renders under address with pin and controls
- [x] Task 3: Wire coordinate updates and synchronized store location fields in `pages/admin/AdminSettingsScreen.tsx` → Verify: Address and store lat/lng update when user pins on map
- [x] Task 4: Run build check to verify syntax and types → Verify: `npm run build` succeeds

## Done When
- [x] HQ / Store Physical Address defaults to "Carmona Commercial Center, Governor's Drive, Cavite, Philippines"
- [x] Interactive live map allows clicking/dragging a pin to update address and GPS coordinates in realtime
- [x] "Detect GPS" button captures live browser location
- [x] Carmona Hub reset button quickly restores default official coordinates
- [x] Clean build and verified UI
