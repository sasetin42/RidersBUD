# Notification System Enhancement Plan

## Objective
Fix and enhance the notification system to ensure that specific customers are reliably notified when critical booking events occur. These events include:
1. 1st Payment / Downpayment approval.
2. Mechanic accepting / being assigned to the job.
3. Mechanic updating the job status.

## Current State Analysis
- **Notifications Engine**: The application uses `sendNotification` in `context/DatabaseContext.tsx` to dispatch notifications to specific `recipientId`s (e.g., `customer-{customerId}`).
- **Payment Approvals**: `verifyBookingPayment` currently sends a notification. However, manual payment updates via `updateBookingPayment` do *not* notify the customer.
- **Mechanic Assignment**: The function `assignMechanicToBooking` handles attaching a mechanic to a booking but does *not* notify the customer.
- **Job Status Updates**: The function `updateBookingStatus` logs the status history but does *not* dispatch a notification to the customer.

## Proposed Changes

All changes will be contained within **`context/DatabaseContext.tsx`**, making this the single source of truth for these events. This ensures that regardless of which frontend screen triggers the update (Admin, Mechanic, or System), the customer always receives the notification.

### 1. Notify 1st Payment / Downpayment Approval
**Target Function**: `updateBookingPayment`
- **Action**: After successfully updating the payment status in Firestore (or local state), fetch the booking to retrieve the `customerId`.
- **Notification Details**:
  - `recipientId`: `customer-${booking.customerId}`
  - `title`: '✅ Payment Updated'
  - `message`: `Your payment has been successfully recorded and your booking is confirmed.` (Customize based on 'partial' vs 'paid' status).
  - `type`: 'success'
  - `link`: `/customer-portal/booking-detail/${id}`

### 2. Notify Mechanic Accepted the Job
**Target Function**: `assignMechanicToBooking`
- **Action**: Add a `sendNotification` call after the Firestore `updateDoc` resolves.
- **Notification Details**:
  - `recipientId`: `customer-${booking.customerId}` (requires fetching the booking first).
  - `title`: '👨‍🔧 Mechanic Assigned'
  - `message`: `${mechanic.name} has accepted your job and will be handling your service.`
  - `type`: 'info'
  - `link`: `/customer-portal/booking-detail/${bookingId}`

### 3. Notify Mechanic Job Status Updates
**Target Function**: `updateBookingStatus`
- **Action**: Add a `sendNotification` call to notify the customer of the new status (e.g., "In Progress", "Completed").
- **Notification Details**:
  - `recipientId`: `customer-${booking.customerId}`
  - `title`: '🔄 Booking Status Updated'
  - `message`: `Your booking status has been updated to: ${status}.`
  - `type`: 'info'
  - `link`: `/customer-portal/booking-detail/${id}`

## Implementation Steps
1. Open `context/DatabaseContext.tsx`.
2. Locate `updateBookingPayment` and insert the `sendNotification` logic.
3. Locate `assignMechanicToBooking`. Since it currently only receives `bookingId` and `mechanic`, it will need to fetch the `booking` object from the local state (`db?.bookings.find(b => b.id === bookingId)`) to get the `customerId` before sending the notification.
4. Locate `updateBookingStatus`. It already finds the `booking` object. Insert the `sendNotification` logic after the successful Firestore update.
5. Verify that `sendNotification` is properly imported and accessible within these functions.
6. Test the flow by manually simulating these actions via the Admin or Mechanic portals and observing the customer's notification inbox.
