# Implementation Plan: Services Summary UI Enhancements

This document outlines the detailed implementation plan for modifying the Booking Screen's services summary section.

## 1. Overview
We aim to improve the visual presentation of selected services in Step 2 (`renderStep2`) of the booking process. Specifically, we will make the service images more prominent and style the estimated service completion time in a bold, eye-catching badge design.

## 2. Success Criteria
* Service image thumbnails in the Booking Summary (Step 2) are resized from `w-12 h-12` to a larger size (`w-20 h-20` or `w-24 h-24`).
* The estimated time display is styled using a primary-colored badge instead of a plain text block.
* Raw Clock SVG is replaced by the standard `Clock` icon from `lucide-react`.

## 3. Scope of Changes

### Target File
* [BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx)

### Changes Breakdown

#### Component / Area: `renderStep2` Selected Services Summary List
* **Image Container Adjustment:**
  * Find the service thumbnail container (currently at lines 1191-1198):
    ```tsx
    <div className="w-12 h-12 rounded-lg bg-[#222] border border-white/5 overflow-hidden flex-shrink-0 relative">
    ```
  * Update classes from `w-12 h-12` to `w-20 h-20` (or `w-24 h-24` depending on the exact visual layout layout constraints).
  
* **Estimated Time Styling Badge:**
  * Find the estimated time section (currently at lines 1206-1213):
    ```tsx
    {service.estimatedTime && (
        <div className="flex items-center gap-1 mt-1.5 text-[9px] text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Est: {service.estimatedTime}</span>
        </div>
    )}
    ```
  * Replace the container's styling to match:
    ```tsx
    className="bg-primary/20 border border-primary/20 text-primary text-[9px] font-black rounded-lg inline-flex items-center gap-1.5 px-2.5 py-1 mt-1.5"
    ```
  * Replace the raw `<svg>` element with the imported `<Clock>` component from `lucide-react`:
    ```tsx
    <Clock size={10} />
    ```

## 4. Verification & Testing Checklist

- [ ] Verify TypeScript compiles successfully: `npx tsc --noEmit`
- [ ] Verify image container doesn't overflow or shrink unexpectedly on small viewports.
- [ ] Verify text truncation and line clamp behaves correctly for service details layout alongside the larger thumbnail.
- [ ] Run the UI checklist scanner to audit the aesthetic changes: `python .agent/skills/frontend-design/scripts/ux_audit.py .`
