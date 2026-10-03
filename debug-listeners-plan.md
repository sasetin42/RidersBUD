# Plan: Fix Listener Cleanup & Console Warnings / Errors

## Goal
Resolve Firebase Realtime Database and Firestore listener leaks in `CallContext.tsx` and `DatabaseContext.tsx`, and provide guidance on browser extension noise (`contentscript.js`, `Grammarly-check.js`).

## Root Cause Analysis
1. **`CallContext.tsx`**:
   - `listenForIncomingCalls` attaches an `onValue` listener on `calls/incoming/${userId}`, which internally sets up another `onValue` listener on `calls/${callId}` without guaranteeing teardown if the outer effect or component unmounts before the inner call ends.
   - When cleanup runs, it called `off(incomingRef)` instead of using the modular unsubscribe function returned by `onValue(incomingRef, ...)`.
   - Also, `ringingTimeoutRef`, `resetTimeoutRef`, and `callListenerUnsubscribeRef` were not cleanly torn down on component unmount or when `listenForIncomingCalls` changes.
2. **`DatabaseContext.tsx`**:
   - Multiple staggered timeouts (`staggerPrivate`) and asynchronous `checkAndSubscribe` calls can overlap during rapid auth changes or dev re-mounts (React StrictMode), creating duplicate active Firestore / RTDB listeners.
   - Staggered timers need to be tracked and cancelled in unmount cleanup so they don't fire after unmount.
3. **Browser Extensions**:
   - `contentscript.js` (`MaxListenersExceededWarning`, `ObjectMultiplex - orphaned data`) is emitted by Web3 browser wallet extensions (MetaMask / Phantom) injecting into web pages.
   - `Grammarly-check.js` (`Permissions policy violation: unload is not allowed in this document`) is caused by Grammarly's content script attempting to bind `unload` events.
   - These are external to application code and can be silenced by testing in Incognito mode or adjusting extension permissions for localhost.

## Tasks
- [x] Task 1: Fix `CallContext.tsx` listener cleanup — use modular `unsubscribe()` for both the incoming calls listener and call details listener, ensure `ringingTimeout` and `callListenerUnsubscribeRef` are cleanly stopped on unmount and transition.
- [x] Task 2: Fix `DatabaseContext.tsx` listener lifecycle — track `staggerPrivate` timeouts in an array and clear them in cleanup; cancel previous active `privateUnsubs` before re-subscribing.
- [x] Task 3: Verify the changes by running project lint / type check or relevant verification script.
- [x] Task 4: Enhance in-app global warning/error suppression in `index.html` to swallow third-party extension noise (`Grammarly-check`, `contentscript.js`, and `runtime.lastError` channel closed errors) before they surface in the developer console.
- [x] Task 5: Document developer browser extension configuration steps.

## Done When
- [x] Firebase RTDB & Firestore listeners are cleanly unsubscribed on unmount and auth change.
- [x] No memory leaks or runaway listeners from `CallContext` and `DatabaseContext`.
- [x] Application builds/passes checks cleanly.
