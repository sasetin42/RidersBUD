# Inspection & Remediation Plan: Booking Services Mechanics & E-Commerce Products

**Goal:** Ensure the end-to-end Booking Services Mechanics flow and Products E-Commerce ordering/checkout system are bug-free, fully responsive, error-tolerant, and launch-ready with real-time Firestore persistence and stock controls.

---

### Phase 1: Mechanics Booking Services Flow Hardening
- [ ] **Task 1: Strict Availability & Real-Time Job Limitation in `pages/BookingScreen.tsx`**
  - **Issue:** Currently, mechanics with active jobs (`Mechanic Assigned`, `En Route`, `In Progress`) can sometimes still be selected or navigated to Step 4 if filters shift or card clicks slip through.
  - **Fix:** In `handleSelectMechanic`, strictly block any busy mechanic (`isMechanicBusy(mechanic.id)` returns true) with a clear notification toast or error banner. Enforce active jobs capacity ceiling. Also ensure mechanics with `isOnline: false` are strictly omitted for today's bookings.
  - **Verification:** Mechanics currently on an active job cannot be clicked or proceeded with; available online mechanics proceed cleanly.

- [ ] **Task 2: Robust Booking Confirmation & Blank Screen Prevention in `pages/BookingConfirmationScreen.tsx`**
  - **Issue:** If network latency occurs when redirecting from payment or direct booking creation, `getDoc` or query listeners that fail to find a Firestore document immediately fall back to redirecting to `/customer-portal/`, resulting in perceived booking disappearance or blank screens.
  - **Fix:** Add a resilient multi-tier fallback: check `locationState.bookings`, then active cached `database.bookings`, then direct `getDoc` with graceful retry before navigating away.
  - **Verification:** Immediate transition to booking confirmation screen without flickering, redirect loops, or missing data.

---

### Phase 2: E-Commerce Products & Cart/Checkout Hardening
- [ ] **Task 3: Dynamic Stock Boundary & Out-of-Stock Protection in `context/CartContext.tsx` & `pages/CartScreen.tsx`**
  - **Issue:** `addToCart` increments quantity indefinitely without checking item stock limit, allowing users to add 50 units when only 2 are in stock, causing checkout failures or overselling.
  - **Fix:** Check `item.stock` in `addToCart` in `CartContext.tsx`. If quantity reaches stock, prevent further addition and alert the user. In `CartScreen.tsx`, disable "Proceed to Checkout" if any item in cart exceeds current stock or is sold out, highlighting the affected item.
  - **Verification:** Users cannot add or order more items than currently in stock.

- [ ] **Task 4: Comprehensive Multi-Payment & COD / GCash / HitPay Support in `pages/PaymentScreen.tsx`**
  - **Issue:** User selected "Both" for GCash and HitPay, plus Cash on Delivery (COD). Currently, COD is not presented in the payment method list in `PaymentScreen.tsx`, and stock is not automatically deducted upon confirmed order creation.
  - **Fix:**
    1. Add Cash on Delivery (COD) as a first-class payment method option in `PaymentScreen.tsx`.
    2. Support HitPay, Manual GCash, and COD with dedicated order statuses (`Pending` for COD/GCash, `Processing` for HitPay).
    3. Deduct stock from Firestore/local DB upon successful order creation in `DatabaseContext.tsx` (`addOrder`).
  - **Verification:** Customers can choose between HitPay, Manual GCash, or COD; orders record with correct status and inventory decrements accurately.

---

### Phase 3: Comprehensive Verification & Lint Audit
- [ ] **Task 5: End-to-End Build & Type Verification**
  - Execute `npm run build` and `npm run typecheck` to ensure 0 compile or runtime errors across all updated components.
