# Implementation Plan - Fix Car Rental 50% Downpayment Flow

## 1. Problem Analysis
In the Car Rental booking and payment process, the reservation is required to collect a **50% Downpayment** initially, marking the booking as partially paid (`50% DP Paid`), with the remaining 50% left as the outstanding balance.

However, in `pages/ServicePaymentScreen.tsx` line 102:
```ts
const isDeposit = useMemo(() => {
    return booking?.paymentStatus === 'deposit' || (paid === 0 && !booking?.isRental);
}, [booking, paid]);
```
The explicit check `!booking?.isRental` forced `isDeposit` to be `false` whenever a Car Rental booking entered `ServicePaymentScreen.tsx`. Consequently:
1. `amountToPay` defaulted to `total - paid` (the full 100% price: ₱6,500.00 instead of ₱3,250.00).
2. The user was redirected to pay the full 100% amount via HitPay or GCash.
3. Upon payment return, `newPaidAmount` equaled `totalAmount`, forcing `isFullyPaid = true` and `paymentStatus = 'paid'` ("Fully Paid").
4. `ServicePaymentConfirmationScreen` displayed `FULLY PAID` and `TOTAL PAID: ₱6,500.00` instead of `50% DP PAID` and `Amount Paid (50% Deposit): ₱3,250.00` with `Remaining Balance: ₱3,250.00`.

## 2. Proposed Changes

### 1) Fix Deposit Evaluation in `pages/ServicePaymentScreen.tsx`
- Correct `isDeposit` to include Car Rentals when they have not completed full payment:
  ```ts
  const isDeposit = useMemo(() => {
      if (booking?.isRental) {
          return (paid === 0) || booking?.paymentStatus === 'deposit' || booking?.paymentStatus === 'partial';
      }
      return booking?.paymentStatus === 'deposit' || paid === 0;
  }, [booking, paid]);
  ```
- Ensure `amountToPay` computes:
  ```ts
  const amountToPay = useMemo(() => {
      if (isDeposit && paid === 0) {
          return total * 0.5;
      }
      return Math.max(0, total - paid);
  }, [total, paid, isDeposit]);
  ```
- Ensure `handleProcessPayment` and manual GCash verification update:
  - If it's a deposit payment (`isDeposit` and `paid === 0`): `paidAmount` becomes `total * 0.5`, `paymentStatus = 'partial'`, `isPaid = false`, `downpaymentAmount = amountToPay`.
  - If it's paying the remaining balance: `paidAmount = total`, `paymentStatus = 'paid'`, `isPaid = true`.

### 2) Align Initial Booking Record in `pages/RentCarScreen.tsx`
- Ensure `pendingBookingData` explicitly specifies:
  - `downpaymentAmount: bookingDetails.totalPrice * 0.5`
  - `paidAmount: 0`
  - `paymentStatus: 'partial'`
  - `isRental: true`
  - `totalAmount: bookingDetails.totalPrice`
- Ensure the sessionStorage transaction object properly passes `isRental: true`, `amount: downpayment`, and `totalAmount: bookingDetails.totalPrice`.

### 3) Verify `pages/ServicePaymentConfirmationScreen.tsx`
- Verify that when `paidAmount` is 50% and `totalAmount` is 100%:
  - `isFullyPaid` evaluates to `false`.
  - `isDownpayment` evaluates to `true`.
  - Header badge displays `50% DP Paid` in amber with pulse indicator.
  - Receipt details show:
    - `Total Service Fee: ₱6,500.00`
    - `Amount Paid (50% Deposit): ₱3,250.00`
    - `Remaining Balance: ₱3,250.00`

## 3. Verification & Quality Assurance
- ✅ `npx tsc --noEmit`: Executed cleanly with 0 TypeScript errors.
- ✅ `npm run build`: Vite production bundle generated successfully in 17.13s with exit code 0.
- ✅ Fixed inverted rental deposit check in `pages/ServicePaymentScreen.tsx`.
- ✅ Structured rental `pendingBookingData` with `downpaymentAmount` and `remainingBalance` in `pages/RentCarScreen.tsx`.
- ✅ Verified `pages/ServicePaymentConfirmationScreen.tsx` badge, amounts, and hero message render `50% DP Paid` and calculate balances properly.
