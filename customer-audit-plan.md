# Customer Portal Audit Plan

## Goal
Audit the Customer-side codebase (screens, components, contexts, and integration points) to identify and log bugs, security vulnerabilities, routing weaknesses, and user experience issues.

---

## 1. Audit Scope & File Targets

### A. Core Customer Contexts (State & Sync)
*   [AuthContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/AuthContext.tsx) - Session management, Firestore user synchronization, and role-based access control.
*   [DatabaseContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/DatabaseContext.tsx) - Global application queries, booking mutations, and real-time listeners.
*   [CartContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/CartContext.tsx) - Cart updates, persistent checkout items, and quantity modifiers.
*   [WishlistContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/WishlistContext.tsx) - Wishlist caching and synchronization.
*   [NotificationContext.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/context/NotificationContext.tsx) - Real-time push and in-app alerts.

### B. Principal Customer Screens (`pages/`)
*   [HomeScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/HomeScreen.tsx) - Main entry, location tracking, dynamic services, and promotions.
*   [BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx) - Booking configurator, service type selection, location pins, and payment prep.
*   [BookingDetailScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingDetailScreen.tsx) - Tracking active jobs, real-time map, cancellation flows.
*   [MyGarageScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/MyGarageScreen.tsx) - Vehicle profile curation, fields validation, and primary selection.
*   [PartsStoreScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/PartsStoreScreen.tsx) & [PartDetailScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/PartDetailScreen.tsx) - Catalog rendering, stock checks, and cart integration.
*   [PaymentScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/PaymentScreen.tsx) & [ServicePaymentScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/ServicePaymentScreen.tsx) - Processing gateway transactions.

### C. Shared & Interactive Components (`components/`)
*   [BottomNav.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/BottomNav.tsx) - Portal switching, active state presentation.
*   [HomeLiveMap.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/HomeLiveMap.tsx) & [MapComponent.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/MapComponent.tsx) - Geolocation, map rendering.
*   [ConnectivityMonitor.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/ConnectivityMonitor.tsx) - Network offline checks.
*   [CustomerMechanicChatModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/components/customer/CustomerMechanicChatModal.tsx) - Dedicated real-time communication.

---

## 2. Potential Problem Areas & Focus Vectors

### A. State Management & Auth Synchronization
*   **Bypass Session Incoherencies**: The coexistence of Firebase Authentication and `localStorage` caching (`ridersbud_customer_session`, etc.) could cause state misalignment if a user signs out, clears cache, or switches accounts.
*   **Cross-Portal Session Collisions**: Potential context leaking or state overwrites if customer, mechanic, or admin portal tabs are open simultaneously on the same browser (storage key collisions).

### B. Route Guarding & Leakage
*   **Role Protection**: Inspect route checks in `App.tsx` for leakage where an authenticated customer might manually navigate to admin (`/admin-portal/*`) or mechanic (`/mechanic-portal/*`) routes.
*   **Deep-Link Validation**: Ensure unauthenticated deep links redirect properly without displaying blank states or loading loops.

### C. API/Firestore Fault Tolerance & Payment Gateways
*   **Payment Webhooks & Callbacks**: Trace GCash modal and HitPay callback routes. Ensure edge cases (user closes modal prematurely, network times out, API fails) are handled cleanly without double charging or locking booking status.
*   **Offline Support / Firestore Caching**: Verify behavior when Firestore goes offline mid-booking. Determine if state transitions crash or gracefully cue.

### D. UI/UX Glitches
*   **Map Responsiveness & Rendering**: Inspect maps inside `BookingScreen` and `HomeLiveMap` to ensure touch actions work on mobile views and don't trigger layout shifting or infinite rerenders.
*   **Profile Incompleteness Guard**: Ensure the Profile Incompleteness redirect loop is not escapeable and doesn't lead to screen flickering.

---

## 3. Step-by-Step Verification Procedure

Follow this order to execute the audit, compile findings, and prepare verification scripts:

| Task ID | Action Name | Description | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **AUD-01** | Static Analysis Run | Run the repository linter and TypeScript compiler. | Run `npm run lint` and `npx tsc --noEmit`. Fix any static analysis blockers. |
| **AUD-02** | Security Scan Run | Run the project security scanner script to find dependency issues or secret leaks. | Run `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`. |
| **AUD-03** | Route Leakage Review | Manually audit route guards in `App.tsx`. | Verify customer auth/role checks block access to admin/mechanic portal URLs. |
| **AUD-04** | Payment Logic Review | Audit `PaymentScreen.tsx`, `ServicePaymentScreen.tsx`, and `HitPayService.ts`. | Trace payment flow transitions and exception handling paths. |
| **AUD-05** | Build and Run Verification | Build the workspace to verify there are no compilation errors. | Run `npm run build`. |

---

## 4. Phase X Checklist
- [ ] Lint & TypeScript Check: Passed without blockers.
- [ ] Security Scan: Completed.
- [ ] Route Guards: Audited.
- [ ] Payment APIs: Verified callback resilience.
- [ ] Build Check: Successful build outputs.
