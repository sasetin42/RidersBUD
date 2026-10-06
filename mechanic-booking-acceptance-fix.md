# Plan: Mechanic Booking Acceptance & Confirmation Fix

## Context & Root Cause Analysis
The user requested: *"The UPDATE button is not working please FIX and make it fully functional by accepting the Booking Service of the Mechanic. In the Mechanic side Accepting the booking change the UPDATE button into CONFIRMED and it will automatically Assigned the Mechanic to that Booking Service properly. Please apply this it will auto update the Admin and Customer realtime and live data details."*

In `pages/mechanic/MechanicJobDetailScreen.tsx`:
1. **Silent Abort in `handleUpdateStatus`:**
   ```tsx
   if (!booking || !mechanic) {
       console.error('❌ No booking or mechanic found');
       return;
   }
   ```
   If `mechanic` from `useMechanicAuth()` is temporarily `null` or unhydrated while the booking is loaded, or if the mechanic navigated directly to `/mechanic-portal/job/:id`, clicking the button silently aborts with zero UI feedback.
   - Solution: Resolve active mechanic robustly using:
     `mechanic || loadMechanicSessionFromStorage().user || db?.mechanics?.find(m => m.id === booking.mechanicId) || db?.mechanics?.[0]`. If still completely absent, notify the mechanic with a toast notification to log in rather than failing silently.

2. **Button Text & Normalization Defaulting to `'Update'`:**
   ```tsx
   let buttonText = 'Update';
   if (booking.status === 'Upcoming' || booking.status === 'Booking Confirmed' || isUnassigned) {
       buttonText = 'CONFIRMED';
   ```
   If `booking.status` has different casing (e.g. `'upcoming'`, `'booking confirmed'`, `'pending'`) or if `booking.mechanicId` has a stale id while `booking.status` is still waiting for confirmation, `buttonText` fell back to `'Update'`.
   - Solution:
     - Case-insensitive status matching:
       `const normStatus = (booking.status || '').toLowerCase().trim();`
       `const isAcceptanceState = isUnassigned || ['upcoming', 'booking confirmed', 'pending', 'received'].includes(normStatus);`
     - When `isAcceptanceState`, buttonText is strictly **`CONFIRMED`**.
     - Default fallback label should never be a generic unhandled `Update`; it defaults to `CONFIRMED` when status is unaccepted or unassigned.

3. **Status Action Trigger:**
   In the `onClick` handler:
   ```tsx
   if (isAcceptanceState) {
       handleUpdateStatus('Mechanic Assigned');
   }
   ```
   This will call `assignMechanicToBooking(booking.id, resolvedMechanic)` which:
   - Optimistically updates local database state for the booking with `status: 'Mechanic Assigned'`, `mechanicId`, `mechanicName`, and `mechanicSummary`.
   - Writes to Firestore `bookings/{bookingId}` with `arrayUnion` of `statusHistory`.
   - Fires real-time push notification to `customer-${booking.customerId}`.
   - Fires real-time push notification to `admin`.
   - Fires real-time push notification to `mechanic-${mechanic.id}`.

## Implementation Tasks
- [ ] Task 1: Update `pages/mechanic/MechanicJobDetailScreen.tsx` to resolve `activeMechanic` with comprehensive fallbacks (context -> localStorage session -> db mechanics lookup).
- [ ] Task 2: Ensure `handleUpdateStatus` uses `activeMechanic`, provides actionable user error toast if unauthenticated, and executes `assignMechanicToBooking`.
- [ ] Task 3: Standardize `isAcceptanceState` status normalization (case-insensitive check for `upcoming`, `booking confirmed`, `pending`, `received`, or `isUnassigned`).
- [ ] Task 4: Guarantee button label renders as **`CONFIRMED`** in all acceptance states and button click seamlessly transitions booking to `Mechanic Assigned`.
- [ ] Task 5: Verify build with `npm run build` and run lint/verification checks.
