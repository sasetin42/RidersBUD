# Plan: Auto-Offline Inactive Mechanics with Customizable Admin Settings

## Goal
Implement a fully customizable auto-offline system for mechanics when they are inactive for a specified duration (customizable in hours/minutes via Admin Backend System Settings). Ensure both client and server/background state reflect the auto-offline status seamlessly.

---

## Technical Architecture & Findings

1. **System Settings Extension in Admin Backend**:
   - In `types.ts`: Extend `Settings` interface with:
     - `mechanicAutoOfflineEnabled?: boolean` (Toggle switch, default: `true`)
     - `mechanicInactivityThresholdHours?: number` (Duration in hours, default: `1`, supports decimal e.g., 0.5 for 30 mins or 1, 2, 4, 8)
     - `mechanicAutoOfflineWarningMinutes?: number` (Optional notice lead time)
   - In `components/admin/settings/tabs/OperationsSettingsTab.tsx`:
     - Add a dedicated **"Mechanic Availability & Inactivity Rules"** section under Operations settings.
     - Controls:
       - Toggle: "Auto-Offline Inactive Mechanics" (Enable/Disable)
       - Number Input / Presets: "Inactivity Timeout (Hours)" (e.g. 1 hour default, min 0.25h / 15m to 24h)
       - Clear explanatory description with live status preview.
   - In `context/DatabaseContext.tsx`:
     - Ensure `getCachedSettings()` provides sensible defaults (`mechanicAutoOfflineEnabled: true`, `mechanicInactivityThresholdHours: 1`).

2. **Mechanic Activity Tracking & Inactivity Detection**:
   - In `types.ts` on `Mechanic`:
     - `lastActive?: string` (ISO timestamp) is already partially recorded by `usePresence`.
     - Also track `lastActionTimestamp?: string` whenever a mechanic performs actions (accepts job, updates job status, sends chat, updates profile, or app focus/heartbeat).
   - In `context/MechanicAuthContext.tsx`:
     - Check mechanic's `lastActive` or last user interaction timestamp against `db.settings.mechanicInactivityThresholdHours`.
     - When `mechanic.isOnline === true`, if the current time minus the mechanic's `lastActive` (or last interaction) exceeds the threshold, automatically transition mechanic to `isOnline = false` and update Firestore + local storage.
     - Provide user notification / toast explaining: *"You were set to Offline due to X hour(s) of inactivity."*
     - Reset timer on user interaction (clicks, touches, keystrokes, job updates).

3. **Global / Customer & Admin Inactivity Verification**:
   - In `pages/BookingScreen.tsx` (`filteredAndSortedMechanics`):
     - When filtering available mechanics for booking, if `mechanicAutoOfflineEnabled` is active and a mechanic's `lastActive` exceeds the threshold, treat them as inactive/offline so customers are not shown stale "Available Now" badges for abandoned sessions.
   - In `context/DatabaseContext.tsx`:
     - Provide auto-reconciliation or sweep: if an admin views mechanics or on interval, inactive mechanics whose online flag wasn't cleared (e.g., closed browser tab without explicit logout) are marked offline or evaluated consistently.

---

## Tasks

### Phase 1: Planning & Schema (Settings & Types)
- [x] **Task 1: Extend System Settings Types**
  - Update `Settings` in `types.ts` with `mechanicAutoOfflineEnabled`, `mechanicInactivityThresholdHours`.
  - Update default settings in `DatabaseContext.tsx`.

### Phase 2: Admin Backend UI (Operations Tab)
- [x] **Task 2: Build Customization Controls in Operations Settings Tab**
  - Add "Mechanic Availability & Auto-Offline Rules" card in `components/admin/settings/tabs/OperationsSettingsTab.tsx`.
  - Include enable/disable toggle, threshold hours input with quick presets (e.g. 30m, 1h, 2h, 4h), and informative helper notes.

### Phase 3: Mechanic Inactivity Monitor & Auto-Offline Execution
- [x] **Task 3: Implement Mechanic Activity Watcher & Auto-Offline in `MechanicAuthContext.tsx`**
  - Add user activity listeners (pointer/touch/keyboard/visibility).
  - Check inactivity against `db.settings.mechanicInactivityThresholdHours` on interval.
  - Automatically call `updateOnlineStatus(false)` and notify the mechanic when inactivity threshold is reached.
- [x] **Task 4: Public Filtering in Booking Screen & Listing Consistency**
  - Update `BookingScreen.tsx` filter so inactive online mechanics without recent heartbeats are filtered out or shown accurately.

### Phase 4: Verification & Audit
- [x] **Task 5: Compile & Build Verification**
  - Run `npm run build` to verify type safety and bundle creation.

---

## Done When
- [x] Admin can fully toggle and adjust the inactivity timeout in the Admin Settings -> Operations tab.
- [x] Online mechanics who remain inactive for the configured duration are automatically transitioned to Offline status in Firestore and in the UI.
- [x] Booking Screen and Admin Mechanics listings reflect the offline status accurately.
