# Phased Implementation Plan - Call Receiving and Connection Cleanup Fix

## Overview
This plan addresses two critical issues with call receiving and termination in the RidersBUD App:
1. **Bypass Login Detection**: The current implementation of `CallContext.tsx` only retrieves `auth.currentUser?.uid` to identify the current user. Since customer and mechanic bypass logins use local storage bypass data, their `userId` in `CallContext` remains empty. This disables the `listenForIncomingCalls` listener.
2. **RTDB Listener Leakage**: Firebase RTDB listeners (`onValue`) set up during `startCall` and `answerCall` are never unsubscribed when a call transitions to `ended`, `declined`, or `missed`, leading to potential memory and event listener leaks.

We will resolve these issues by enhancing bypass login detection, implementing active listener cleanup, and verifying clean sound and connection tear downs.

---

## Project Type
- **MOBILE** (React Native/Capacitor App)

---

## Success Criteria
- [ ] Users signed in via bypass modes (Customer/Mechanic/Admin) are successfully identified, and their active incoming call listeners function correctly.
- [ ] Active Firebase RTDB listeners are properly teardown/unsubscribed when calls end, get declined, or are missed.
- [ ] Decline and End calls safely stop active sound effects and perform full connection cleanups.

---

## Tech Stack
- **React** (Context API, Hooks)
- **Firebase Auth** (Authentication state listener)
- **Firebase Realtime Database** (Presence and signaling)
- **WebRTC API** (Peer connection and audio context management)

---

## File Structure
Only the following file will be modified:
```
context/
  └── CallContext.tsx  # Call provider and WebRTC signaling context
```

---

## Task Breakdown

### Phase 1: Context & Auth Synchronization Updates
#### Task 1.1: Enhance `getLocalUserId` to read from local storage bypass data
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`, `mobile-design`
- **Dependencies**: None
- **INPUT**:
  - `context/CallContext.tsx` current `getLocalUserId()` implementation.
- **OUTPUT**:
  - A revised `getLocalUserId()` that checks for:
    1. `auth.currentUser?.uid`
    2. Detected local storage bypass user data: `ridersbud_customer_user_data`, `ridersbud_mechanic_user_data`, or `ridersbud_admin_user_data`.
- **VERIFY**:
  - Visual inspection of the code ensures all three potential user data storage keys are checked if Firebase Auth has no current user.

#### Task 1.2: Listen to Auth Change Events
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`
- **Dependencies**: Task 1.1
- **INPUT**:
  - The `useEffect` hook in `CallContext.tsx` that registers the `onAuthStateChanged` listener.
- **OUTPUT**:
  - Registered event listeners for `customerAuthChange`, `adminAuthChange`, and `storage` to trigger `getLocalUserId()` and update state dynamically.
- **VERIFY**:
  - Confirm the state updates when any of the storage/auth events are dispatched.

---

### Phase 2: RTDB Listener Management
#### Task 2.1: Add `callListenerUnsubscribeRef`
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`
- **Dependencies**: None
- **INPUT**:
  - Ref declarations in `CallContext.tsx`.
- **OUTPUT**:
  - A new ref: `const callListenerUnsubscribeRef = useRef<(() => void) | null>(null);`
- **VERIFY**:
  - Ensure the ref is properly declared and initialized to `null`.

#### Task 2.2: Manage RTDB Listener Subscriptions in Call Lifecycle
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`
- **Dependencies**: Task 2.1
- **INPUT**:
  - `startCall` and `answerCall` methods setting up `onValue` listeners.
- **OUTPUT**:
  - Unsubscribe previous active listeners before setting up new ones.
  - Store the unsubscribe functions returned by `onValue()` in `callListenerUnsubscribeRef.current`.
- **VERIFY**:
  - Trace `startCall` and `answerCall` to ensure `callListenerUnsubscribeRef.current` is correctly updated.

#### Task 2.3: Teardown Listeners in `cleanupPeerConnection`
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`
- **Dependencies**: Task 2.2
- **INPUT**:
  - `cleanupPeerConnection` method in `CallContext.tsx`.
- **OUTPUT**:
  - Call `callListenerUnsubscribeRef.current()` if it exists, and set it to `null`.
- **VERIFY**:
  - Verify that both caller and callee connections unsubscribe from RTDB updates when cleaning up.

---

### Phase 3: Sound Teardown & Transition Verification
#### Task 3.1: Confirm Decline & End Call Cleanup Path
- **Agent**: `mobile-developer`
- **Skills**: `clean-code`
- **Dependencies**: Task 2.3
- **INPUT**:
  - `declineCall` and `endCall` implementations.
- **OUTPUT**:
  - Verification that the functions call `cleanupPeerConnection()` which correctly stops call sounds (`callSounds.stop()`) and frees RTC/RTDB resources.
- **VERIFY**:
  - Check that the call status state transitions to `'idle'` and sound effects stop.

---

## Phase X: Final Verification

### Verification Checklist
- [ ] No purple/violet hex codes introduced.
- [ ] Socratic Gate was respected.
- [ ] Verification command executed.

### Run Verification Command
```bash
# Lint checks
npm run lint
```

## ✅ PHASE X COMPLETE
- Lint: [ ]
- Build: [ ]
- Date: 2026-06-20
