# Implementation Plan: GCash Payment Cancellation Enhancements

This document describes the step-by-step technical implementation to enhance the GCash payment cancellation flow in `components/GCashPaymentModal.tsx`.

---

## 📋 Objectives
1. **Firestore Clean-up Security**: Ensure that if the customer cancels the booking/rental payment *before* they upload a receipt, any pre-saved or pre-registered document matching the `bookingId` is completely deleted from the Firestore backend (specifically preventing leaks/dangling records).
2. **Context-Aware Navigation**: Redirect the user back to the last section/flow of the services (meaning close the modal, and if the path is `/service-payment`, go back to the previous screen using `navigate(-1)` instead of hard-redirecting to `/customer-portal/` home page).

---

## 🛠️ Step-by-Step Implementation Details

### 1. `components/GCashPaymentModal.tsx` Modifications

* **Objective 1: Cleanup Condition Fix**
  - Locate the cancel handler function: `handleConfirmCancelBooking`.
  - Currently, it contains:
    ```typescript
    if (newBookingData && !bookingData && bookingId) {
        // delete doc...
    }
    ```
    If `bookingData` is fetched and exists in the snapshot, `!bookingData` is `false`, which blocks the cleanup!
  - **Proposed Fix**: Change this to check if the payment is still in the preparation phases (`step === 'qr'` or `step === 'upload'`). If the user hasn't successfully uploaded and submitted the receipt (`step` is not `'waiting'`), we must clean up the document regardless of whether it's already synchronized locally:
    ```typescript
    if (newBookingData && bookingId && (step === 'qr' || step === 'upload')) {
        try {
            const collectionName = isRental ? 'rentalBookings' : 'bookings';
            await deleteDoc(doc(firestore, collectionName, bookingId));
            console.log(`Successfully deleted cancelled ${collectionName}:`, bookingId);
        } catch (err) {
            console.error("Failed to delete booking document on cancel:", err);
        }
    }
    ```

* **Objective 2: Path-Based Navigation Redirection**
  - Within `handleConfirmCancelBooking`, update the navigation target.
  - Instead of unconditionally calling:
    ```typescript
    navigate('/customer-portal/', { replace: true });
    ```
  - **Proposed Fix**: Check if the current pathname is `/service-payment`. If so, navigate back to the previous screen. Otherwise, fall back to the customer portal homepage:
    ```typescript
    if (window.location.pathname.includes('/service-payment')) {
        navigate(-1);
    } else {
        navigate('/customer-portal/', { replace: true });
    }
    ```

---

## 📊 Task Breakdown & Assignment

### Task 1: Modify `handleConfirmCancelBooking` Logic
- **Agent**: `frontend-specialist`
- **Skill**: `clean-code`
- **Priority**: High
- **Dependencies**: None
- **INPUT**: Current `handleConfirmCancelBooking` in `components/GCashPaymentModal.tsx`.
- **OUTPUT**: Modified `handleConfirmCancelBooking` function with the strict cleanup phase condition and context-aware pathname navigation.
- **VERIFY**: Open modal on booking, trigger cancel before uploading receipt. Verify document is not present in the Firestore backend. Verify page goes back to the previous step if route is `/service-payment`.

---

## ✅ Phase X: Verification Checklist

After the changes are proposed, perform the following verification:
- [ ] Run `npm run lint` and `npx tsc --noEmit` to verify type safety.
- [ ] Run `npm run build` to verify production bundling.
- [ ] Validate color accessibility guidelines and that no standard templates are broken.
