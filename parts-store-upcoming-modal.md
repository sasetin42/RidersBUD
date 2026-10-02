# Implementation Plan: Upcoming Features Modal for Disabled Parts Store

## Goal
When the **Parts & Tools Store** operational module is disabled in the Admin System Settings (`modules.find(m => m.id === 'parts-store')?.enabled === false`), ensure that in the customer view all store interactions (Bottom Navigation Store tab, Home Quick Actions, Parts Banners & Category chips, Marketing Banner, Search modal, and direct routes) display a high-conversion, responsive "Upcoming Features" modal with Admin announcement support, rather than navigating to a disabled screen or displaying a generic error.

## User Review Required
> [!IMPORTANT]
> The modal supports mobile responsive touch gestures, displays the live Admin custom notice when set, previews upcoming automotive store capabilities (OEM Genuine Parts, Live Delivery Tracking, Certified Fitment, On-Demand Installation), and offers an instant "Notify Me on Launch" interest toggle saved to local preferences.

## Proposed Changes

### 1. New Component: `components/UpcomingStoreModal.tsx`
- Branded, automotive-themed modal adhering to clean-code standards (dark theme, primary orange/amber accents, no purple).
- Displays:
  - Dynamic status badge: "Feature In Development / Coming Soon"
  - Admin custom announcement if set (`module.bannerMessage`)
  - Key upcoming feature highlights with automotive icons
  - Interactive "Notify Me When Live" toggle button
  - Clean dismiss / close action

### 2. Global Helper or Hook: `hooks/useStoreModuleStatus.ts`
- Convenient hook returning `{ isStoreEnabled, storeModule, openUpcomingModal, UpcomingModalComponent }` so any customer screen or component can easily intercept clicks.

### 3. Navigation & Banners Interception
- **`components/BottomNav.tsx`**: Intercept Store tab (`/customer-portal/parts-store`) when `isStoreEnabled === false` to trigger modal without route change.
- **`pages/HomeScreen.tsx`**: Intercept "Parts Store" button, Genuine Parts Hero Banner, and Category chips.
- **`components/MarketingBanner.tsx`**: Intercept slide 2 ("Shop Parts").
- **`components/CustomerSearchModal.tsx`**: Intercept clicking product/part results.

### 4. Direct Route Protection in `App.tsx`
- In `ModuleGuard`: When `moduleId === 'parts-store'` is disabled, render the rich Upcoming Features showcase screen directly on `/customer-portal/parts-store`, `/part/:id`, `/cart`, and `/wishlist` with a button to explore other active services or return home.

## Verification Plan
1. Check TypeScript compilation: `npm run typecheck`
2. Test both operational states:
   - Enabled: Normal store navigation and shopping works.
   - Disabled: Clicking Store in bottom nav, banners, and search opens the Upcoming Features modal.
3. Validate mobile layout responsiveness and accessibility.
