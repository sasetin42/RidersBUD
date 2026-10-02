# Optimize Review Submission & Loading Performance

## Goal
Optimize "Submitting Review..." in `ReviewModal.tsx`, `BookingDetailScreen.tsx`, and `BookingHistoryScreen.tsx` to complete instantly, smoothly, and reliably without spinning stalls.

## Analysis & Root Causes
1. **Double Await Blocking**: In `ReviewModal.tsx`, `handleSubmit` waits for `await onSubmit()`. In `BookingDetailScreen.tsx` and `BookingHistoryScreen.tsx`, `onSubmit` waits for `await addReview()`.
2. **Blocking Operations in `addReview`**: While optimistic state updates were applied to local db state, `addReview` in `DatabaseContext.tsx` still awaited `updateBookingPromise` (remote Firestore network write) before resolving, causing high latency or freezing when internet connection has jitter or cold Firestore latencies.
3. **Modal Closing Latency**: `onClose()` in `ReviewModal.tsx` was only called after the entire async operation finished, leaving the user staring at "Submitting Review..." spinner with zero tactile progression.
4. **Instant Optimistic Completion**: By closing the modal with a fast micro-delay / instant success check, updating the review state optimistically, and letting Firestore sync in the background with toast confirmation, the submission completes in <100ms instead of several seconds.

## Tasks
- [ ] Task 1: Streamline `DatabaseContext.tsx` `addReview` and `updateReview` so the primary UI resolves immediately once optimistic local state and background write promises are initiated.
- [ ] Task 2: Enhance `ReviewModal.tsx` button state to display a brief fast tactile checkmark/success pulse ("Submitting..." -> "Submitted! ✓") and close promptly.
- [ ] Task 3: In `BookingDetailScreen.tsx`, ensure `handleReviewSubmit` cleans up all modal states, marks booking as reviewed immediately, and navigates smoothly without delay.
- [ ] Task 4: In `BookingHistoryScreen.tsx`, ensure `handleSubmitReview` updates local state immediately and closes modal swiftly.
- [ ] Task 5: Build verification with `npm run build` and ensure no TypeScript/lint regressions.

## Done When
- [ ] Submitting a review in the modal completes swiftly and responsively without hanging on "Submitting Review...".
- [ ] Modal closes cleanly and navigates / updates state immediately.
- [ ] Production build passes with 0 errors.
