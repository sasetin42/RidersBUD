# PLAN: Secure Notification Retrieval and Role-Based Filtering

This document details the step-by-step implementation plan to update the notification system. The goal is to enforce strict role-based and user-based controls to ensure that users (Customers, Mechanics, and Admins) only receive notifications belonging directly to their respective accounts, preventing cross-account and cross-role leaks.

---

## 📋 Objectives
1. **Restrict Firestore Access Rules**: Update the Firestore security rules for the `/notifications` collection to validate that a reading user's UID and role match the notification's `recipientId` and `recipientRole`.
2. **Restrict Firestore Subscriptions (DatabaseContext)**: Add Firestore query filters (where clauses) when subscribing to notifications so that clients only pull matching documents from Firestore, preventing permission-denied errors and unauthorized reads.
3. **Strict In-Memory Filtering (NotificationContext)**: Guarantee that even if local cache/broadcast fallbacks are used, notifications are filtered strictly by the current user's role (`recipientRole`) and ID (`recipientId`).
4. **Comprehensive Verification**: Validate the changes with TypeScript checks, lint checks, Firestore rules syntax tests, and checklist validation.

---

## 🛠️ Step-by-Step Implementation Details

### 1. Firestore Security Rules Update (`firestore.rules`)
- **Location**: [firestore.rules](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/firestore.rules)
- **Goal**: Restrict `read` access on notifications so a user can only read a document if they are authorized.
- **Rule Changes**:
  - Add helper function `isCustomer()`:
    ```javascript
    function isCustomer() {
      return isAuth() && exists(/databases/$(database)/documents/customers/$(request.auth.uid));
    }
    ```
  - Update `notifications` match block:
    ```javascript
    match /notifications/{notificationId} {
      allow read: if isAuth() && (
        resource.data.recipientId == "all" || 
        (resource.data.recipientId == request.auth.uid && (
          (resource.data.recipientRole == "customer" && isCustomer()) ||
          (resource.data.recipientRole == "mechanic" && isMechanic())
        )) ||
        (resource.data.recipientId == "admin" && isAdmin())
      );
      allow write: if isAuth();
    }
    ```

### 2. Firestore Subscriptions Update (`DatabaseContext.tsx`)
- **Location**: [DatabaseContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/DatabaseContext.tsx)
- **Goal**: Apply dual query filters on `recipientId` and `recipientRole` to align with the new Firestore security rules.
- **Rule Changes**:
  - **Mechanic Subscriptions**:
    Update the subscription query for mechanics so it filters by both `recipientId` and `recipientRole`:
    ```typescript
    subscribePrivateQuery(query(collection(firestore, 'notifications'),
        where('recipientId', 'in', [mechanicId, 'all']),
        where('recipientRole', '==', 'mechanic')
    ), 'notifications');
    ```
  - **Customer Subscriptions**:
    Update the subscription query for customers to filter by both `recipientId` and `recipientRole`:
    ```typescript
    subscribePrivateQuery(query(collection(firestore, 'notifications'),
        where('recipientId', 'in', [customerId, 'all']),
        where('recipientRole', '==', 'customer')
    ), 'notifications');
    ```
  - **Admin Subscriptions**:
    Ensure the admin subscription query filters specifically for admin notifications:
    ```typescript
    subscribePrivateQuery(query(collection(firestore, 'notifications'),
        where('recipientRole', '==', 'admin')
    ), 'notifications');
    ```

### 3. In-Memory Filter Enhancements (`NotificationContext.tsx`)
- **Location**: [NotificationContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/NotificationContext.tsx)
- **Goal**: Strengthen in-memory `filter` checks to ensure zero leaks.
- **Rule Changes**:
  - Refactor the `.filter(...)` block for `notifications` array:
    ```typescript
    .filter(n => {
        if (clearedAt > 0 && (n.timestamp ?? 0) <= clearedAt) return false;

        if (isAdminAuthenticated) {
            return n.recipientRole === 'admin';
        }
        if (isMechanicAuthenticated && mechanic) {
            return n.recipientId === mechanic.id && n.recipientRole === 'mechanic';
        }
        if (isAuthenticated && user) {
            return n.recipientId === user.id && n.recipientRole === 'customer';
        }

        return false;
    })
    ```

---

## 📊 Task Breakdown & Assignment

### Task 1: Update Firestore Rules
- **Agent**: `database-architect`
- **Skill**: `database-design`
- **Priority**: Critical
- **Dependencies**: None
- **INPUT**: Current [firestore.rules](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/firestore.rules)
- **OUTPUT**: Updated [firestore.rules](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/firestore.rules) containing role-restricted match patterns
- **VERIFY**: Check the rules file syntax and make sure they compile with no errors

### Task 2: Update Database Context Queries
- **Agent**: `backend-specialist`
- **Skill**: `api-patterns`
- **Priority**: Critical
- **Dependencies**: Task 1
- **INPUT**: Current [DatabaseContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/DatabaseContext.tsx)
- **OUTPUT**: Updated queries restricting notification fetching to matching recipientId and recipientRole
- **VERIFY**: No Firestore permission-denied warnings in the console for each logged-in role

### Task 3: Refactor Local Filter Logic
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Priority**: High
- **Dependencies**: Task 2
- **INPUT**: Current [NotificationContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/NotificationContext.tsx)
- **OUTPUT**: Updated filter ensuring strict checking of `recipientRole` matches the active session
- **VERIFY**: Verify that switching accounts does not briefly display notifications from other roles

---

## ✅ Phase X: Verification Checklist

1. **Type & Lint Auditing**:
   - Run typecheck command: `npx tsc --noEmit`
   - Run lint command: `npm run lint`
2. **Security & Rules Validation**:
   - Validate Firestore rules format and deployment compatibility
   - Run local security scan: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
3. **Manual Flow Checks**:
   - Log in as Customer; verify zero Admin/Mechanic notifications are pulled/visible
   - Log in as Mechanic; verify zero Admin/Customer notifications are pulled/visible
   - Log in as Admin; verify only admin-scoped notifications are received
