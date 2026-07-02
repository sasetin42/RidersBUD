# Implementation Plan: Call Status Reset & Subsequent Call Reception Fix

This plan details the changes required to ensure subsequent calls can be received by transitioning `callStatus` back to `'idle'` and clearing `callInfo` after a call finishes.

---

## 🔍 Root Cause Analysis

In `context/CallContext.tsx`:
- When an active call ends or is declined/missed, `callStatus` is set to the ended status (e.g., `'ended'`, `'declined'`, or `'missed'`).
- The status remains in this state indefinitely.
- The listener `listenForIncomingCalls` ignores incoming call notifications because it strictly checks:
  ```typescript
  if (callStatus === 'idle') { ... }
  ```
- Because `callStatus` never transitions back to `'idle'`, the app is blocked from receiving any subsequent calls.

---

## 🛠️ Proposed Solution

We will implement a helper function / state resetting flow in `CallContextProvider` to transition the status back to `'idle'` and clean up `callInfo` after a call completes:

1. **Add a Reset Timer Reference:**
   Add a `useRef` to store the ID of the timeout resetting the call state:
   ```typescript
   const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   ```

2. **Define a State Reset Function:**
   Implement a helper function to transition the state back to `'idle'`:
   ```typescript
   const handleCallTermination = useCallback((finalStatus: CallStatus, wasConnected: boolean) => {
     // Clear any existing reset timeout
     if (resetTimeoutRef.current) {
       clearTimeout(resetTimeoutRef.current);
       resetTimeoutRef.current = null;
     }

     setCallStatus(finalStatus);
     cleanupPeerConnection();

     // If the call was never connected (ringing/calling phase), reset immediately
     if (!wasConnected) {
       setCallStatus('idle');
       setCallInfo(null);
       incomingCallRef.current = null;
     } else {
       // If the call was active/connected, show the ended status for 2 seconds
       resetTimeoutRef.current = setTimeout(() => {
         setCallStatus('idle');
         setCallInfo(null);
         incomingCallRef.current = null;
       }, 2000);
     }
   }, [cleanupPeerConnection]);
   ```

3. **Modify `listenForIncomingCalls` Subscriber:**
   Update the logic around lines 456–461:
   ```typescript
   } else if (callData.status === 'ended' || callData.status === 'declined' || callData.status === 'missed') {
     // Check if the current call status is already 'connected' before ending
     const wasConnected = callStatus === 'connected';
     handleCallTermination(callData.status, wasConnected);
   }
   ```

4. **Modify `startCall` Subscriber:**
   Update the logic around lines 591–617:
   ```typescript
   if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
     const wasConnected = callStatus === 'connected';
     handleCallTermination(data.status, wasConnected);
     // ... rest of the logic to add to history remains unchanged ...
   }
   ```

5. **Ensure Proper Timer Cleanup on Unmount:**
   In the main `useEffect` that performs cleanups, ensure we clear the `resetTimeoutRef` to prevent memory leaks:
   ```typescript
   useEffect(() => {
     return () => {
       if (resetTimeoutRef.current) {
         clearTimeout(resetTimeoutRef.current);
       }
     };
   }, []);
   ```

---

## 📈 Verification & Testing Plan

1. **Verify No-leak Behavior:** Verify that unmounting the call screen or components cleanly handles the timeout.
2. **First Call Receipt:** Initiate and answer a call successfully, then end it. Verify the transition to `'ended'` status and the subsequent automatic reset to `'idle'` status after 2 seconds.
3. **Subsequent Call Receipt:** Verify that another call can be immediately initiated/received right after the 2-second timeout.
4. **Immediate Reset on Unconnected Calls:** Initiate an outgoing call, decline/cancel it immediately (or have the receiver decline it before connection). Verify that `callStatus` resets to `'idle'` instantly, bypassing the 2-second delay.
