# Plan: Payment Buttons Logic on Booking Detail Screen

## Goal
Implement logic in `pages/BookingDetailScreen.tsx` to conditionally render the correct payment button (either "Pay Now" for the initial 50% downpayment or "PAY THE BALANCE" for the final 50% fulfillment payment) based on the verification status of the downpayment.

## Tasks
- [ ] Task 1: Locate the payment actions section in `pages/BookingDetailScreen.tsx` (around lines 841–858).
- [ ] Task 2: Implement the conditional rendering logic:
  - **Unpaid Downpayment**: If `!booking.isVerified && !booking.gcashReceiptUrl`, render an active **"PAY NOW"** button. This button will navigate the user to the payment screen (`/customer-portal/service-payment`, passing the booking state) to submit the 50% deposit.
  - **Paid & Verified Downpayment**: If the downpayment is paid and verified (`booking.isVerified`), and the service is not completed and not fully paid (`status !== 'Completed' && !booking.isPaid`), render the **"PAY THE BALANCE"** button.
  - **Balance Payment Activation**: Keep the "PAY THE BALANCE" button disabled unless the mechanic requests it and sets `booking.gcashPaymentStatus === 'awaiting_payment'`.
- [ ] Task 3: Verify style and layout consistency with existing buttons (using the primary color scheme, font configuration, and responsiveness).

## Done When
- [ ] "PAY NOW" is visible and active when no downpayment has been submitted or verified.
- [ ] "PAY THE BALANCE" replaces "PAY NOW" once the downpayment is verified, remaining disabled until the mechanic changes the status to `awaiting_payment`.
