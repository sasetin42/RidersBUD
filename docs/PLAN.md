# Plan: Replicating secondaryAuth Logic & Verifying User Management Actions

This plan details the steps required to synchronize password updates for `Customer` and `Mechanic` roles initiated by Administrators using `secondaryAuth`, verify admin operations, and validate the typescript compilations.

---

## 1. Analysis & Goals

### The Problem
Currently, in `context/DatabaseContext.tsx`, when an administrator updates an Admin User's password via `updateAdminUser`, it imports `secondaryAuth` helper utilities to sign into Firebase Authentication using a secondary auth instance and synchronize the password update in Firebase Authentication. However, this synchronization is missing for `updateCustomer` and `updateMechanic`, leading to a discrepancy between Firestore database fields and the actual Firebase Authentication credentials.

### Goals
1. Replicate the `secondaryAuth` password synchronization flow within `updateCustomer` and `updateMechanic` methods in `DatabaseContext.tsx`.
2. Confirm the complete flow of **Edit**, **Delete**, **Suspend**, and **View Details** actions across the Admin pages (`AdminUsersScreen.tsx`, `AdminCustomersScreen.tsx`, and `AdminMechanicsScreen.tsx`).
3. Ensure zero type compilation issues with validation via `npx tsc --noEmit`.

---

## 2. Impacted Files

| File Path | Description | Role / Target |
| :--- | :--- | :--- |
| `context/DatabaseContext.tsx` | Core Database Context holding CRUD methods | Modify `updateCustomer` and `updateMechanic` to invoke `secondaryAuth` password updates |
| `pages/admin/AdminUsersScreen.tsx` | Admin screen managing all user categories | Verify actions: Edit, Delete, Suspend, and View Details |
| `pages/admin/AdminCustomersScreen.tsx` | Admin screen managing customer-specific lists | Verify actions: Edit, Delete, View Details |
| `pages/admin/AdminMechanicsScreen.tsx` | Admin screen managing mechanic-specific lists | Verify actions: Edit, Delete, View Details |

---

## 3. Solutioning & Implementation Steps

### Phase 1: Replicating `secondaryAuth` Logic in `DatabaseContext.tsx`

#### A. In `updateCustomer`
1. Retrieve `oldCustomerDoc` from state/cache (`db?.customers.find(c => c.id === id)`).
2. Compare `customer.password` with `oldPassword`.
3. If password changed, dynamically import `getSecondaryAuth` & `deleteSecondaryAuth` from `../utils/secondaryAuth`, and `signInWithEmailAndPassword` & `updatePassword` from `firebase/auth`.
4. Run `signInWithEmailAndPassword` on the `secondaryAuth` instance using the old email and old password.
5. Apply `updatePassword` to update the credential user to the new `customer.password`.
6. Clean up secondary authentication instance via `deleteSecondaryAuth(secondaryApp)`.

#### B. In `updateMechanic`
1. Retrieve `oldMechanicDoc` from state/cache (`db?.mechanics.find(m => m.id === id)`).
2. Compare `mechanic.password` with `oldPassword`.
3. If password changed, invoke the same `secondaryAuth` update routine: sign in using secondary instance and update the password.
4. Clean up the secondary application instance in the `finally` block.

---

### Phase 2: Verifying Context Actions

We will systematically review the frontend event triggers to ensure they are robustly linked to context calls:

1. **Edit Action**:
   - Verify `AdminUsersScreen.tsx` maps the payload edits of customers and mechanics, invoking `updateCustomer` and `updateMechanic` appropriately.
   - Verify `AdminCustomersScreen.tsx` invokes `updateCustomer(data)` when saved.
   - Verify `AdminMechanicsScreen.tsx` invokes `updateMechanic(data)` when saved.

2. **Delete Action**:
   - Verify that confirming a deletion triggers `deleteCustomer(id)` or `deleteMechanic(id)` from the database context.
   - Ensure corresponding Firestore batch processes propagate cleanly (removing sub-elements or references).

3. **Suspend Action**:
   - Verify toggling user active/suspended status resolves to `status: 'Active' | 'Suspended'` in payloads sent to `updateCustomer` and `updateMechanic`.

4. **View Details Action**:
   - Validate state bindings like `viewingUserDetail` in `AdminUsersScreen` are fully populated and rendering correctly for each specific role category (Admin, Customer, Mechanic).

---

### Phase 3: Validation & Quality Control

Execute the TypeScript compiler in dry-run mode to verify the absence of syntax errors:
```bash
npx tsc --noEmit
```
This ensures types are correctly mapped and import statements resolve without compilation bugs.
