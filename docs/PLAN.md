# Mobile Header Display & Sticky Layout Enhancement Plan

## Objective
Fix excessive top dead space above the mobile application header, align the header flush to the very top edge of the mobile display across all pages, make headers sticky across all screens, and ensure responsive layout on all devices (Android APK, iOS, PWA, and Web).

## Root Causes Identified
1. **Unwanted Root Safe-Area Padding**: In `index.css` (lines 1247-1251), `body.pwa-fullscreen #root, html.pwa-mode-fullscreen #root` has `padding-top: env(safe-area-inset-top, 0px)`. This pushes the entire `#root` container downwards from the top edge, creating a large black void above the header.
2. **Double Top Offsets in Container Layouts**: Several screens and wrappers had extraneous top margins or lacked explicit `top: 0` constraints for sticky headers.
3. **Inconsistent Header Components**: `CustomerHeader.tsx` and `Header.tsx` lacked cohesive safe-area handling within the header element itself. Safe-area top padding belongs **inside** the header background container, not above `#root`, so that the header background touches the bezel/notch while header text and icons remain clear of physical punch-holes.

## Proposed Changes
1. **`index.css`**:
   - Remove root-level `padding-top` on `#root` that caused the gap.
   - Define a unified `.mobile-sticky-header` utility class that handles `position: sticky; top: 0; z-index: 50; padding-top: var(--safe-top);` cleanly.
2. **`components/CustomerHeader.tsx`**:
   - Modernize container styling to sit flush at `top-0`, integrate safe-area inset top cleanly into header height/padding, and ensure crisp responsiveness.
3. **`components/Header.tsx`**:
   - Update to match the exact same sticky behavior, flush top edge alignment, and responsiveness.
4. **Customer & Mechanic Pages Audit**:
   - Verify `BookingDetailScreen.tsx`, `HomeScreen.tsx`, `BookingScreen.tsx`, `CartScreen.tsx`, `BookingHistoryScreen.tsx`, `ProfileScreen.tsx`, `ServicesScreen.tsx`, and Mechanic screen layouts so the main scrollable container smoothly scrolls underneath the sticky header without jumping.
5. **Verification**:
   - Check build and linting.
   - Verify layout responsiveness across mobile viewport simulations.

## Acceptance Criteria
- No empty black gap above the header on mobile displays.
- Header sits flush at the very top edge of the phone display.
- Header is smoothly sticky on all pages when scrolling content.
- Clean responsive layout for both Customer and Mechanic portals.
