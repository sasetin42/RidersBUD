# Car Rental Service Details Enhancement & Real-Time Sync Plan

## Goal
Enhance the Car Rental "Service Details" card in Admin Bookings Screen with rich vehicle specifications, single-row rental period layout, and enable a fully functional, live-synced status dropdown dynamically tailored to the driving mode (Self Drive vs. With Driver) that directly updates Customer/Client booking status in real time.

## Proposed Changes

### 1. [AdminBookingsScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminBookingsScreen.tsx)
- **Enhanced Service Details Card for Car Rental (Lines ~4880–4932):**
  - **Single Row Rental Period:** Convert the Rental Period display into a sleek, dedicated full-width single horizontal row (`flex flex-row items-center justify-between`) displaying:
    - Start Date ➔ End Date with arrow indicator
    - Calculated Rental Duration badge (e.g. `1 Day`, `3 Days`)
    - Pickup/Return Time badge
  - **Enriched Car Details & Badges:**
    - Transmission (`Automatic` / `Manual`)
    - Fuel Policy / Engine (`Gasoline` / `Diesel`)
    - Seating Capacity (`5 Seats` / `7 Seats`)
    - Plate Number badge
    - Daily Rate (`₱X,XXX / day`)
    - Pickup Station / Live Location click-through button with GPS badge
- **Dynamic Real-Time Status Dropdown for Car Rental (Lines ~5132–5160):**
  - Detect driving mode: `isSelfDrive` vs `withDriver`.
  - **Self Drive options:** `['Received', 'Confirmed', 'Ready for Pickup', 'Active Rental', 'Completed', 'Cancelled']`.
  - **With Driver options:** `['Received', 'Confirmed', 'Driver Assigned', 'Ready for Pickup', 'Completed', 'Cancelled']`.
  - Add status meta styling & icons for `Ready for Pickup` (Key / Car), `Active Rental` (Navigation / Compass), `Confirmed` (CheckCircle), and `Received` (Clock).
- **Real-Time Data State Sync in `handleStatusChange` (Lines ~2673–2692):**
  - Use `await updateRentalBooking(booking.id, { status: newStatus })` so local `db.rentalBookings` is instantly updated optimistically in React context alongside Firestore document update.
  - Dispatch in-app customer notification via `sendNotification` with direct link `/customer-portal/booking/${booking.id}` so customer receives immediate notice.
  - In `handleConfirmCancellation`, update `updateRentalBooking` with `status: 'Cancelled', cancelReason: reason`.

### 2. [DatabaseContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/DatabaseContext.tsx)
- Enhance `updateRentalBooking` to ensure `statusHistory` logging and customer push notification if `status` changed, guaranteeing both Firestore and React state stay in lockstep.

### 3. [BookingDetailScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingDetailScreen.tsx)
- **Timeline & Step Progress Matching (Lines ~1160–1240):**
  - Synchronize timeline steps for `isRental`:
    - Step 0: `Received` (or `50% DP Reserved`)
    - Step 1: `Confirmed`
    - Step 2: `Ready for Pickup`
    - Step 3: `Active Rental`
    - Step 4: `Completed`
  - Update `currentStepIndex` calculation to cleanly map status aliases (`received`, `confirm`, `confirmed`, `ready for pickup`, `active rental`, `in use`, `completed`).
  - Update `getStatusColor` to support `Ready for Pickup`, `Active Rental`, `Received`.

## Verification Criteria
- [x] Rental Period in Admin Bookings Screen renders in **one row** with Start Date ➔ End Date + Duration badge.
- [x] Extra car specifications (transmission, fuel, seats, plate, daily rate) render clearly in the Service Details card.
- [x] Dropdown options for Self Drive include: `Received`, `Confirmed`, `Ready for Pickup`, `Active Rental`, `Completed`, `Cancelled`.
- [x] Status updates trigger instant local context update and Firestore document write on `rentalBookings`.
- [x] Customer's `BookingDetailScreen.tsx` reflects the updated status and moves the progress timeline accurately in real-time.
- [x] TypeScript check (`npm run build`) passes with zero errors.
