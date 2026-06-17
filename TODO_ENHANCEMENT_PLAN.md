# Enhancement Plan: Call Function & Mechanic Notification

## 1. Information Gathered

### Current Implementation Analysis:

#### A. Call Functionality (CallContext.tsx & CallUI.tsx):
- **CallContext.tsx**: Implements WebRTC-based audio/video calling using Firebase Realtime Database for signaling
- **CallUI.tsx**: Provides UI components (`CallButton`, `IncomingCallModal`, `OutgoingCallModal`, `ActiveCallBar`)
- Uses STUN servers for NAT traversal
- Supports audio and video calls
- Has mute and speaker controls
- Currently implemented between:
  - Customer ↔ Mechanic (via BookingDetailScreen.tsx, MechanicJobDetailScreen.tsx, MechanicDashboardScreen.tsx)

#### B. Mechanic Notification Issue (DatabaseContext.tsx):
- `verifyBookingPayment` function (lines 922-963):
  - Currently ONLY notifies customer when admin verifies GCash receipt
  - **Does NOT notify the mechanic** when payment is verified
- Flow problem:
  - Customer uploads GCash receipt → Admin verifies → Customer notified ✓
  - But mechanic is NOT notified → Mechanic doesn't know they should start the job

### Root Cause:
When admin verifies payment via `verifyBookingPayment`, the mechanic is never notified. The mechanic only gets notified when:
- They are assigned to a booking (via `assignMechanicToBooking`)
- Job is completed (via `updateBookingStatus`)

## 2. Plan

### Task 1: Fix Mechanic Notification on Payment Verification (DatabaseContext.tsx)

**File**: `context/DatabaseContext.tsx`

**Modification**: In `verifyBookingPayment` function, add mechanic notification after customer notification

**New Logic**:
```typescript
// After customer notification, add:
if (booking.mechanicId) {
    await sendNotification({
        recipientId: `mechanic-${booking.mechanicId}`,
        title: isFinalBalancePayment ? '🎉 Job Fully Paid - Ready to Start!' : '💰 Deposit Received - Job Confirmed!',
        message: `Payment verified for "${serviceName}". Customer ${isFinalBalancePayment ? 'has fully paid' : 'deposit confirmed'}. Please proceed with the service.`,
        type: 'success',
        date: new Date().toISOString(),
        read: false,
        link: `/mechanic-portal/job-detail/${bookingId}`
    });
}
```

### Task 2: Add Live Support Call Button (SupportChatScreen.tsx)

**File**: `pages/SupportChatScreen.tsx`

**Modification**: Add `CallButton` component to enable customers to call Live Support (admin)

**New Logic**:
- Import `CallButton` from `../components/CallUI`
- Add call button in the support chat header orfooter
- Use `targetRole="admin"` for Live Support

### Task 3: Enhance Call Context with TURN Servers

**File**: `context/CallContext.tsx`

**Modification**: Add TURN servers for better connectivity behind firewalls/NATs

**New STUN/TURN Configuration**:
```typescript
const STUN_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Add free TURN servers (limited)
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    ]
};
```

## 3. Dependent Files to be Edited

1. `context/DatabaseContext.tsx` - Add mechanic notification in verifyBookingPayment
2. `pages/SupportChatScreen.tsx` - Add CallButton for Live Support
3. `context/CallContext.tsx` - Add TURN servers for better connectivity

## 4. Followup Steps

1. Rebuild the development server to test changes
2. Test the call functionality:
   - Customer → Mechanic call
   - Mechanic → Customer call
   - Customer → Live Support call (new)
3. Test mechanic notification after payment verification
