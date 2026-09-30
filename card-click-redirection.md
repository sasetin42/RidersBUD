# Make Transaction Cards Clickable to Complete Details

## Goal
Make the whole transaction card in the Customer Portal feed clickable, redirecting the customer directly to the complete data details for their booking/request.

## Tasks
- [x] Task 1: In `HomeScreen.tsx`, update `detailsUrl` in `allTransactions` for `driver` and `towing` to route to `/customer-portal/booking-detail/${req.id}` → Verify: Driver and Towing have correct detail paths.
- [x] Task 2: Create `handleTransactionCardClick(tx)` in `HomeScreen.tsx` that navigates to dedicated detail pages for maintenance, driver, towing, and orders, or opens the complete details modal for rentals/liaisons → Verify: Correct navigation for each transaction type.
- [x] Task 3: Attach `onClick` and cursor-pointer styling with interactive hover transitions to the main card container → Verify: Hover effect and pointer cursor render cleanly.
- [x] Task 4: Add subtle `<ChevronRight />` affordance icon to the card header → Verify: Visual indicator signals that the entire card is clickable.
- [x] Task 5: Verify inner action buttons (Pay Balance, Track, Cancel, Remove) keep `e.stopPropagation()` and do not accidentally trigger card redirection → Verify: Clicking Cancel opens cancel modal without navigating away.

## Done When
- [x] Clicking anywhere on the card redirects/opens the complete data details view.
- [x] Action buttons (e.g. Cancel) still function independently without unexpected redirection.
