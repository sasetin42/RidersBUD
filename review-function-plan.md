# Task Plan: Fully Functional Review System with Processing Loading States

## Goal
Make the Customer Service Review function fully functional across all booking types (Mechanics, Drivers, Rentals, Liaison) with an animated loading spinner/disabled state when processing, tag toggles that automatically satisfy comment requirements, clear toast/success feedback, and robust Firestore persistence.

## Current State & Root Cause Analysis
1. In `components/ReviewModal.tsx`:
   - Clicking a Quick Tag like "Polite & Helpful" sets the comment, but if internal state or trimming fails, it triggered "Please write a comment about your experience."
   - The modal accepted an external `isSubmitting` prop, but in `BookingDetailScreen.tsx`, `isSubmitting` was not passed! So when the user clicked "Submit Review", there was zero loading feedback on the button.
   - When an error occurred or submission took a few seconds, the button remained active and could be double-clicked.
2. In `context/DatabaseContext.tsx`:
   - `addReview` handles `bookings`, `serviceRequests`, and `rentalBookings`, but lacked support for `liaisonBookings`.
   - Also needs safe handling if `bookingId` has a prefix like `LIA-`, `RNT-`, or `DRV-`.
3. In `pages/BookingDetailScreen.tsx` & `pages/BookingHistoryScreen.tsx`:
   - `isSubmitting` state must be properly passed to `ReviewModal`.
   - Success toast / confirmation feedback should celebrate the review submission.

## Tasks Breakdown
- [ ] Task 1: Update `components/ReviewModal.tsx`
  - Introduce self-contained internal loading state `localSubmitting` (in addition to `isSubmitting` prop) so it immediately shows an animated spinner and disables double clicks on "Submit Review".
  - Ensure selecting Quick Feedback tags clears any validation error immediately.
  - Add text "Submitting..." alongside the spinner for clear feedback.
- [ ] Task 2: Enhance `context/DatabaseContext.tsx`
  - Add `liaisonBookings` handling in `addReview` and `updateReview` so LTO liaison service reviews are stored cleanly.
  - Handle stripped prefix matching (`cleanId`) for bookings, service requests, rentals, and liaison.
- [ ] Task 3: Wire Loading & Feedback in `pages/BookingDetailScreen.tsx`
  - Pass `isSubmittingReview` state to `<ReviewModal />`.
  - Add toast/notification feedback upon successful review submission.
- [ ] Task 4: Run Build & Verification
  - Execute `npm run build` to verify no TypeScript or lint breakages.

## Done When
- [ ] Review button displays a spinner and "Submitting..." during submission.
- [ ] Clicking quick tags (e.g. "Polite & Helpful") automatically clears the error and populates comment.
- [ ] Review persists to Firestore and updates provider/mechanic/driver ratings properly.
- [ ] Zero build or compilation errors.
