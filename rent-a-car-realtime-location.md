# Rent a Car Realtime Location Map & Admin Backend Bookings Display

## Goal
Properly display and highlight the confirmed "Rent a car" realtime service/pick-up location and vehicle rental details in the Admin Backend bookings data and map modals.

## Tasks
- [ ] Task 1: Audit and enhance `rentalBookings` mapping in `AdminBookingsScreen.tsx` to ensure `location` (latitude, longitude, address), `pickupLocation`, `deliveryOption`, `vehicle`, and `carObj` are completely preserved and normalized. → Verify: `pickupLocation` and `location.address` resolve cleanly for all rental bookings without falling back to generic strings.
- [ ] Task 2: Update `LiveMapCard` pin styling and popups for Car Rental bookings so the custom RidersBUD branded orange vehicle/location pin (matching the customer's selection map) or clear "Confirmed Rental Service Location" marker with exact address is rendered. → Verify: Inline map card in the expanded row shows the location badge, accurate pin, and street address tooltip.
- [ ] Task 3: Enhance `BookingLocationModal` when viewing Car Rental bookings so it displays:
  - Confirmed Service / Pick-up Location with live GPS badge & street address (as confirmed on the customer map modal).
  - Selected Rental Car specifications (Make, Model, Year, Plate, Daily Rate, Driving Mode: Self Drive vs With Driver).
  - Rental duration dates & financial breakdown. → Verify: Clicking the map card opens the modal and displays the exact confirmed address and rental details instead of placeholder values.
- [ ] Task 4: In the desktop table and expanded booking row for "Car Rental" tab, ensure the pickup location and service address are clearly visible in the details card. → Verify: Under "Car Rental", the pickup location shows the user's selected address with a map pin icon.
- [ ] Task 5: Build and type check the application. → Verify: `npm run build` or Vite build passes without TypeScript errors.

## Done When
- [ ] Confirmed service location from the Rent a Car map modal is accurately saved and displayed in Admin Backend bookings.
- [ ] Both the inline `LiveMapCard` and expanded `BookingLocationModal` properly render the client's confirmed location and rental details.
- [ ] No regression on other service booking tabs (Services, Driver for Hire, Liaison, Towing).
