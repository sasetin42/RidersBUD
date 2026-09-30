# Active Rental Status Realtime Synchronization Plan

## Goal
Ensure setting status to **Active Rental** in Admin (`AdminBookingsScreen.tsx`) immediately and seamlessly updates customer and client views in real-time across `BookingDetailScreen.tsx`, `HomeScreen.tsx`, and `BookingHistoryScreen.tsx`, including timeline progression, status banners, action buttons, and live rental tracking.

---

## Agent Allocation & Roles
1. **`project-planner`**: Define specification, status string normalization (`Active Rental`, `In Use`, `Active`), and real-time subscription lifecycle.
2. **`frontend-specialist`**: Fix client components (`BookingDetailScreen.tsx`, `HomeScreen.tsx`, `BookingHistoryScreen.tsx`, `AdminBookingsScreen.tsx`) to handle `Active Rental` seamlessly.
3. **`test-engineer`**: Execute TypeScript compilation checks (`npm run build`) and verify end-to-end status propagation.

---

## Root Causes Identified
1. **Timeline Mismatch (`BookingDetailScreen.tsx`)**:
   - `timelineSteps`: Active rental step was defined with `status: 'In Use'`. Admin sets `status: 'Active Rental'`.
   - `currentStepIndex`: Checked `['active', 'in use', 'ongoing'].includes(sLower)`. Since `'Active Rental'.toLowerCase()` is `'active rental'`, it didn't match and fell back to `findIndex(s => s.status === status)`, which returned `-1`. The active step was not highlighted.
2. **Status Banner & Map Label (`BookingDetailScreen.tsx`)**:
   - Explanation text checked `status === 'Active' || status === 'In Use'`, falling back to standard reserved text instead of active driving advisory.
   - MiniMap header/subheading did not recognize `Active Rental`.
3. **Card Badging on Home & History (`HomeScreen.tsx` & `BookingHistoryScreen.tsx`)**:
   - Home screen and Booking History checked `isApproved` using `['approved', 'active', 'in use'].includes(statusLower)`. Missing `'active rental'` caused rental cards to not show the active glowing green state.
4. **Realtime Firestore Subscription (`BookingDetailScreen.tsx`)**:
   - `isLikelyRental` heuristic only checked prefixes `RNT-` or router state. When using Firestore alphanumeric IDs, direct access/refresh fell through to the `bookings` collection listener instead of `rentalBookings`.

---

## Tasks

- [x] **Task 1 (`frontend-specialist`): Fix Timeline & Current Step in `BookingDetailScreen.tsx`**
  - Add `'active rental'` to `timelineSteps` completion checks and set step status to `'Active Rental'`.
  - Update `currentStepIndex` calculation to include `'active rental'`.
  - Verify: Step 4 ("Active Rental") highlights as the active step when status is `Active Rental`.

- [x] **Task 2 (`frontend-specialist`): Fix Status Banners, Alerts & Dispatch in `BookingDetailScreen.tsx`**
  - Update status banner: `status === 'Active Rental' || status === 'Active' || status === 'In Use'` displays "Rental is currently active. Drive safely!" with emergency support hotline.
  - Set MiniMap and Tracking card title to "VEHICLE ON RENTAL - SELF DRIVE" with live odometer/fuel reminders.
  - Disable cancellation button when `status === 'Active Rental'`.
  - Verify: Screen shows active rental banner and active vehicle card.

- [x] **Task 3 (`frontend-specialist`): Enhance Realtime Listener in `BookingDetailScreen.tsx`**
  - Update `isLikelyRental` to check `db?.rentalBookings?.some(r => r.id === bookingId)` and query parameter `isRental=true`.
  - Ensure fallback sync picks up realtime updates from `rentalBookings` collection without refresh.
  - Verify: Realtime Firestore snapshot triggers instant UI re-render when admin updates status.

- [x] **Task 4 (`frontend-specialist`): Update Home & Booking History Cards (`HomeScreen.tsx`, `BookingHistoryScreen.tsx`)**
  - In `HomeScreen.tsx` and `BookingHistoryScreen.tsx`, include `'active rental'` in active/in-progress checks and emerald status badge rendering.
  - Verify: Rental card displays "ACTIVE RENTAL" with active pulsating badge on Home and History tabs.

- [x] **Task 5 (`test-engineer`): Build Verification & Zero-Regression Check**
  - Run `npm run build` to ensure type safety and zero compile errors.
  - Verify all status transitions: `Confirmed` -> `Ready for Pickup` -> `Active Rental` -> `Completed`.

---

## Done When
- [x] Admin switching status to **Active Rental** immediately reflects in Customer `BookingDetailScreen` without manual page reload.
- [x] Timeline displays Step 4 (Active Rental) as active with full styling.
- [x] Status banner displays "Rental is currently active. Drive safely!".
- [x] Active Rental status is badge-highlighted on Customer Home and History screens.
- [x] `npm run build` succeeds cleanly.
