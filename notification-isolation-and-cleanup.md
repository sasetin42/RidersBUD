# Realtime Notification Isolation & Permanent Deletion Execution Plan

## Objective
Fix 99+ notifications flood and notification mixing across Admin, Customer, and Mechanic accounts. Ensure 100% strict real-time isolation per role/account and guarantee permanent, non-reverting deletion across all roles in Firestore.

## Architecture & Design Decisions
1. **Firestore Permissions (`firestore.rules`)**:
   - Allow user deletion if `resource.data.recipientId == request.auth.uid`, or with stripped prefixes `customer-{uid}` / `mechanic-{uid}`, or if `isAdmin()`.
2. **Permanent Deletion Engine (`DatabaseContext.tsx` & `NotificationContext.tsx`)**:
   - `clearAllNotifications`: Batch delete from Firestore directly and purge local state.
   - For broadcast notifications (`recipientId == 'all'`), persist dismissed IDs in user profile / document so they never reappear for that user.
   - Ensure `deleteNotification` executes permanent `deleteDoc` on Firestore with proper error handling and immediate optimistic cache update.
3. **Strict Query & Realtime Isolation**:
   - Admin Bell: strictly displays actionable items for `recipientRole: 'admin'` or `recipientId: 'admin'`.
   - Mechanic Bell: strictly displays `recipientRole: 'mechanic'` matching the mechanic's UID.
   - Customer Bell: strictly displays `recipientRole: 'customer'` matching the customer's UID.
   - Prevent any test or health check logs (e.g. Google Maps API pings) from ever writing to or rendering in `notifications`.
4. **Verification**:
   - Verify Firestore rules and compile project with `npm run build`.

## Tasks
- [x] Task 1: Update `firestore.rules` for robust delete and read permissions.
- [x] Task 2: Standardize `DatabaseContext.tsx` delete and clear methods (batch deletion, broadcast dismissal, no silent re-hydration).
- [x] Task 3: Enforce strict role filtering in `NotificationContext.tsx` and prevent log pollution.
- [x] Task 4: Verify Admin Notifications Screen (`AdminNotificationsScreen.tsx`) batch actions.
- [x] Task 5: Build and compile check (`npm run build`).
