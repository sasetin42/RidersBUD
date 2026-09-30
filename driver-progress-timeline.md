# Plan: Realtime Live Progress Timeline for Driver for Hire

## Overview
Connect the Driver for Hire "Progress Timeline" on the Customer Portal (`BookingDetailScreen.tsx`) directly and in real-time to the Admin backend booking status updates (`serviceRequests` in Firestore & LocalState). When the Admin changes status to **Driver Assigned**, **En Route**, **In Progress**, or **Completed**, the Customer Progress Timeline will instantly sync, update active nodes, glow, track line progress, ETA, and trip status seamlessly.

---

## Task Breakdown

## Task Breakdown

### Task 1: Admin Status Options Alignment
- [x] In `AdminBookingsScreen.tsx`:
  - Ensure the Driver for Hire status options in the dropdown and status change handler include all required workflow statuses:
    `['Pending', 'Driver Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled']`
  - Ensure `handleStatusChange` writes directly via `updateServiceRequestStatus(booking.id, newStatus)` and `updateDoc` to Firestore `'serviceRequests'`.
- **Verification:** When admin selects "En Route" or "Completed", the document in `serviceRequests` updates `status` immediately.

### Task 2: Robust Realtime Firestore Listener in `BookingDetailScreen.tsx`
- [x] Ensure `onSnapshot` on `serviceRequests` triggers reliably whether `bookingId` is prefixed with `DRV-` or is the raw Firestore ID.
- [x] Provide real-time fallback to `db.serviceRequests` optimistic updates from `DatabaseContext`.
- [x] Support real-time driver profile updates (name, phone, photo, ETA, remarks) when admin saves driver assignment.
- **Verification:** Status changes in admin immediately reflect in `fetchedBooking` and `booking.status` with 0ms delay.

### Task 3: Driver for Hire Progress Timeline Realtime Flow & Status Mapping
- [x] In `BookingDetailScreen.tsx`:
  - Synchronize `timelineSteps` and `currentStepIndex`:
    1. **Requested** (Index 0): Status `Pending` / `Pending Admin Review` / `For Verification`
    2. **Driver Assigned** (Index 1): Status `Driver Assigned` / `Confirmed`
    3. **En Route** (Index 2): Status `En Route`
    4. **Trip Ongoing** (Index 3): Status `In Progress` / `Trip Ongoing`
    5. **Completed** (Index 4): Status `Completed` / `Work Done`
  - Verify node activation, ping animation on active current step, connected glow line, and active color transitions.
- **Verification:** Timeline moves from Requested → Driver Assigned → En Route → Trip Ongoing → Completed in real-time as admin clicks statuses.

### Task 4: UI Polish & Realtime Chauffeur Card Synchronization
- [x] Ensure the Assigned Chauffeur & Trip card hides "Pending Assignment" and shows the assigned driver's picture, verified badge, and ETA once `Driver Assigned` or subsequent statuses are reached.
- [x] Ensure the "Assigned Mechanic" card is hidden when `isDriverHire` is true (to avoid showing mechanic cards on a driver hire trip).
- [x] Ensure "Live Route Map", "Message Driver", and "Call Driver" buttons respond dynamically to driver status and live location.
- **Verification:** Chauffeur info, map button, and contact buttons accurately sync with the assigned driver.

### Task 5: End-to-End Verification & Verification Scripts
- [x] Run `npx tsc --noEmit` to verify type safety.
- [x] Run `npm run build` to confirm production build cleanliness.
- [x] Verify real-time status update simulation.

---

## Done When
- [x] Changing status in Admin (`Driver Assigned`, `En Route`, `In Progress`, `Completed`) updates customer Driver for Hire screen in real time without refreshing.
- [x] Timeline steps accurately highlight the current status with animated glow, progress line, and correct index.
- [x] Full production build passes with 0 errors.
