# Complete Profile One-Time Data Storage & Sequence Flow Plan

## Goal
Ensure customer profile completion in `CompleteProfileScreen.tsx` properly validates, formats, stores all personal information and primary vehicle data into Firestore (including image uploads, fallback merging, and session sync), and guarantees that this sequence flow executes strictly **once** without re-prompting or infinite redirect loops upon completion.

---

## Architecture & Data Flow

```
                      [User visits /complete-profile]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
     [Profile already complete]             [Profile incomplete / new user]
  (phone + valid primary vehicle)                        │
                 │                          Fill form (Name, Phone, Address,
                 │                          Category, Make, Model, Year, Plate,
                 │                          Color, Mileage, Vehicle Photos)
                 │                                       │
                 │                               Tap "Complete Setup"
                 │                                       │
                 │                          Validate mandatory fields
                 │                                       │
                 │                          Upload Avatar & Vehicle Photos
                 │                          (Parallelized via storageService)
                 │                                       │
                 │                          Save to Firestore `customers/{uid}`
                 │                          (Set merge: true preserving existing fields)
                 │                                       │
                 │                          Update local session cache & dispatch
                 │                          'customerAuthChange' event
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                             Navigate to `/`
                        (Redirects to `/customer-portal/`)
                                     │
                    App.tsx `isProfileIncomplete()` returns false
                                     │
                      [Customer lands on HomeScreen]
               Flow never re-enters /complete-profile again!
```

---

## Key Problems Identified

1. **Broken redirect route in CompleteProfileScreen**:
   - `CompleteProfileScreen.tsx` (lines 85 and 221) calls `navigate('/home')`.
   - In `App.tsx`, there is NO `/home` route! Customer routes are nested inside `/customer-portal/*` with root `/` redirecting to `/customer-portal/`.
   - Calling `navigate('/home')` hits the wildcard `<Route path="*" element={<Navigate to="/customer-portal" replace />} />`, causing an extra redirect hop and potential timing race before Firestore listeners emit the updated `vehicles` array.
   - **Fix**: Use `navigate('/customer-portal/', { replace: true })`.

2. **Vehicle `type` mismatch**:
   - The initial state in `CompleteProfileScreen.tsx` defaults `vehicle.type` to `'Motorcycle'` while the category defaults to `'Sedans'` and popular models are all cars ('Sedans', 'SUVs', etc.).
   - **Fix**: Dynamically assign `type` to match `category` (e.g. `'Car'`, `'SUV'`, etc.) or `'Automobile'`.

3. **Incomplete data merging on `setDoc`**:
   - `setDoc(doc(firestore, 'customers', fbUser.uid), updatedCustomer)` currently overwrites without preserving existing customer fields (such as `favoriteMechanicIds`, `subscribedMechanicIds`, `notificationSettings`, coordinates `lat`/`lng`, etc.).
   - **Fix**: Fetch or preserve existing doc data and use `{ merge: true }` so no previous account attributes are wiped.

4. **Guarantee Single-Execution Flow ("ginagamit lang sequence flow na ito once")**:
   - When a customer completes setup, write `profileCompleted: true` and `profileCompletedAt: new Date().toISOString()`.
   - Update `localStorage.setItem('ridersbud_customer_session', 'true')` and `saveCustomerSessionToStorage(updatedCustomer, false)` immediately before navigating.
   - Guard check in `useEffect`: if user already has `phone` AND `vehicles.length > 0` (or `profileCompleted === true`), immediately redirect to `/customer-portal/` with `{ replace: true }`, ensuring the screen is never shown again.

---

## Action Tasks

- [ ] **Task 1**: Update `CompleteProfileScreen.tsx` data structure & submission handler.
  - Set `type: 'Car'` (or category-based), ensure `category`, `subCategory`, `color`, `mileage`, `plateNumber`, `make`, `model`, `year` are properly sanitized.
  - Merge with existing customer document data so custom metadata/settings remain intact.
  - Add `profileCompleted: true` and `profileCompletedAt` flags.
- [ ] **Task 2**: Update Session Storage & Route Navigation.
  - Replace `navigate('/home')` with `navigate('/customer-portal/', { replace: true })` in both initial check and submission callbacks.
  - Sync `localStorage` customer user data so `App.tsx`'s `isProfileIncomplete()` evaluates to `false` synchronously before the async Firestore snapshot arrives.
- [ ] **Task 3**: Update `isProfileIncomplete` check in `App.tsx`.
  - Ensure `isProfileIncomplete()` checks `user.profileCompleted || (user.phone && user.vehicles && user.vehicles.length > 0)` and prevents any repeat redirect loops.
- [ ] **Task 4**: Verification & Testing.
  - Run `npx tsc --noEmit` to ensure 0 TypeScript diagnostic errors.
  - Run `npm run build` to verify clean compilation.
  - Verify that the profile completion sequence saves all fields accurately and transitions once to the Customer Portal.
