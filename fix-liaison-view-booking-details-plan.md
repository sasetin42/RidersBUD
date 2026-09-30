# Fix Plan: Liaison Service "View Booking Details" Functionality

## Context & Problem Diagnosis
When customers complete the Liaison payment (e.g. 50% downpayment of ₱750 on a ₱1,500 LTO registration assistance) on the `ServicePaymentConfirmationScreen` (`/customer-portal/service-payment-confirmation`), clicking the orange **"VIEW BOOKING DETAILS >"** button should open `BookingDetailScreen` (`/customer-portal/booking-detail/:bookingId`) and display all booking specifications, documents, liaison officer details, balance settlement options, and progress timeline.

### Root Causes Identified
1. **Missing Service / Liaison Query Parameter & ID formatting in Confirmation Navigation:**
   - In `ServicePaymentConfirmationScreen.tsx` (lines 408–416):
     ```tsx
     navigate(`/customer-portal/booking-detail/${booking.id}`, {
         state: { fromPaymentSuccess: true, booking }
     });
     ```
     - If `booking.id` is not prefixed with `LIA-` (e.g. raw UUID or Firestore auto-generated ID), or if the page is reloaded (causing `location.state` to be null), `BookingDetailScreen` determines `isLikelyLiaison` using `bookingId.startsWith('LIA-') || (navPassedBooking?.isLiaison) || isLiaisonInDb || isLiaisonParam`.
     - In `ServicePaymentScreen.tsx`, `isLiaisonBooking` was not passed forward into `updatedBooking.isLiaison = true`, meaning `navPassedBooking.isLiaison` was `undefined`!
     - In `ServicePaymentConfirmationScreen.tsx`, the navigation did not include query parameters `?isLiaison=true` or pass `isLiaison: true` explicitly in `booking`.
2. **Identification In Seed Resolution (`initialBookingSeed`):**
   - In `BookingDetailScreen.tsx` line 551:
     `navPassedBooking.id === bookingId || navPassedBooking.id?.slice(-6) === bookingId.slice(-6)`
     If `booking.id` in `navPassedBooking` is normalized or has different casing or formatting from `bookingId` in URL, seed matching can fail, causing initial null render.
     Moreover, `navPassedBooking.isLiaison` was checked, but if `navPassedBooking.serviceType` or `navPassedBooking.branchName` or `navPassedBooking.officerName` exists, it should be recognized as a Liaison booking immediately!
3. **Firestore Snapshot Lookup & Fallback:**
   - If `bookingId` in URL does not start with `LIA-`, but is a Liaison booking, `isLikelyLiaison` must also check query params `isLiaison=true`, `service=liaison`, and fuzzy match against `db?.liaisonBookings`.
   - Also, if Firestore `doc(firestore, 'liaisonBookings', bookingId)` lookup fails because the Firestore document key is formatted differently (e.g., without `LIA-` prefix or vice versa), the fallback query directly checks `liaisonBookings` and resolves the local/state seed so it never stays in an infinite spinner or "Booking Not Found".
4. **Header Sequence ID Display:**
   - In `BookingDetailScreen.tsx` line 1091:
     `bookingSequenceId` handles `RNT-` and `DRV-`, but did not have a dedicated formatter for `LIA-` (`LIA-${bookingId.slice(-6).toUpperCase()}` or `booking.referenceNumber`), resulting in generic or missing reference IDs.

---

## Proposed Solution & Execution Steps

### 1. `pages/ServicePaymentScreen.tsx`
- Ensure `updatedBooking` preserves `isLiaison: isLiaisonBooking` in both HitPay return callback and Manual GCash callback.

### 2. `pages/ServicePaymentConfirmationScreen.tsx`
- Update the "View Booking Details" button click handler:
  - Detect if `serviceKind === 'liaison'` or `booking.isLiaison`.
  - Pass `?isLiaison=true&service=liaison` query parameter in the URL.
  - Ensure `booking` in navigation state explicitly includes `{ ...booking, isLiaison: true }` when `serviceKind === 'liaison'`.

### 3. `pages/BookingDetailScreen.tsx`
- **Initial Seed & Identification**:
  - In `initialBookingSeed`, enhance liaison detection: check `navPassedBooking.isLiaison`, `navPassedBooking.type === 'liaison'`, `navPassedBooking.serviceName?.includes('Liaison')`, `navPassedBooking.branchName`, or `urlParams.get('isLiaison') === 'true'`.
  - In `isLiaison` memo, include `urlParams.get('isLiaison') === 'true'` and check for liaison fields (`branchName`, `serviceType`).
  - In `bookingSequenceId` memo, add `isLiaison` support to format sequence ID as `#LIA-${bookingId.slice(-6).toUpperCase()}` or `booking.referenceNumber`.
- **Snapshot & Fallback Resilience**:
  - Ensure `isLikelyLiaison` checks `isLiaisonParam` and local db presence.
  - If `onSnapshot` on `liaisonBookings` fails or returns `docSnap.exists() === false`, fallback smoothly to `navPassedBooking` or local `db.liaisonBookings` matching by ID or last 6 characters, immediately setting `isFetching: false` to eliminate infinite spinners.

---

## Verification Plan
1. Check build compilation with `npm run build`.
2. Verify all paths and handlers for Liaison bookings in `ServicePaymentConfirmationScreen.tsx` and `BookingDetailScreen.tsx`.
