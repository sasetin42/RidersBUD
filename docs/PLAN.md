# Implementation Plan - Update Customer Booking Detail Layout

This plan outlines the changes required to streamline the Customer Booking Detail page layout by modifying actions, improving navigation flow, and cleaning up footer controls.

## Goal
Update the layout of the Customer Booking Detail page in `pages/BookingDetailScreen.tsx` to simplify user communications and navigation.

---

## Impacted Files
- `pages/BookingDetailScreen.tsx`

---

## Detailed Step-by-Step Tasks

### Step 1: Update Progress Timeline Actions List
Locate the actions grid inside the Progress Timeline (around line 774):
1. **Remove Chat Button:** Remove the button that triggers `setIsChatOpen(true)`.
2. **Transform Phone Button:** Replace the two-column grid (`grid-cols-2`) containing Chat and Phone buttons with a single full-width button.
   - It will display a `<Phone size={16} />` icon and the text `"Call Mechanic"`.
   - Maintain the trigger `handleCallMechanic` on click.
3. **Relocate "View All Bookings" Button:** Move this button from the footer into the Progress Timeline actions list, directly below the newly styled Phone button.
   - It will navigate to `/customer-portal/booking-history` on click.

*Expected structure after modification:*
```tsx
{/* Actions Grid */}
<div className="flex-1 flex flex-col gap-3 justify-center">
    {/* PIN LOCATION - Interactive Mini Map */}
    ...
    
    {/* Call Mechanic (Full-Width Row) */}
    <button 
        onClick={handleCallMechanic} 
        className="w-full bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-primary py-3.5 transition-all active:scale-95 text-xs font-bold tracking-wide uppercase"
    >
        <Phone size={16} />
        Call Mechanic
    </button>

    {/* View All Bookings (Moved from Footer) */}
    <button
        onClick={() => navigate('/customer-portal/booking-history')}
        className="w-full bg-[#151515] border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/5 transition text-xs tracking-wider uppercase active:scale-95 flex items-center justify-center gap-2"
    >
        <ClipboardList size={16} className="text-primary" />
        View All Bookings
    </button>

    {/* Review Service & Mechanic persistent button for Completed Status */}
    ...
</div>
```

### Step 2: Remove Footer Buttons
Locate the quick link controls container at the bottom of the main layout (around lines 830-843):
- Remove the entire container `div` class `grid grid-cols-2 gap-3 pb-4` which contains:
  - "View All Bookings" button (now relocated to the actions list).
  - "Back to Home" button (removed entirely).

---

## Verification Criteria
- [ ] **Compilation Check:** Run `npm run build` (or equivalent build command) to verify there are no TypeScript compilation errors.
- [ ] **UI Review:** Open the Booking Detail screen and ensure:
  - The chat button is completely gone.
  - The Phone button is displayed as a full-width action row with text "Call Mechanic".
  - The "View All Bookings" button appears directly below the Phone button.
  - The bottom footer buttons ("View All Bookings" and "Back to Home") are no longer visible.
- [ ] **Behavior Verification:** Verify that clicking "Call Mechanic" triggers the call handler and clicking "View All Bookings" successfully redirects to `/customer-portal/booking-history`.
