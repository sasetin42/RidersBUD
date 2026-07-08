# Plan: Update RentalBookingModal in RentCarScreen

This plan outlines the updates for `RentalBookingModal` in `pages/RentCarScreen.tsx` to enhance its UI, aesthetics, and user experience.

## Overview
We will update the `RentalBookingModal` component in `pages/RentCarScreen.tsx` to improve its visual appeal and design quality. The updates focus on four key areas:
1. **Dynamic Car Image:** Render the selected car's image inside the modal.
2. **Date Picker Calendar Icons:** Add absolute-positioned Calendar icons inside the date input fields.
3. **Include Driver Toggle Redesign:** Redesign the driver selection to make its selection state highly visible using distinct check state cards or an enhanced toggle track.
4. **Colorized Booking Receipt Line Items:** Add high-contrast themed icons with soft background badges next to each row label.

## Project Type
- **Type:** WEB (React web app utilizing Tailwind CSS and Lucide React icons)
- **File to Edit:** [pages/RentCarScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE PROJECT/RIDERSBUD APP/RidersBUD App/pages/RentCarScreen.tsx)

## Tech Stack & Assets
- **Icons:** `lucide-react` (`Calendar`, `Car`, `ShieldCheck`, `UserCheck`, `Receipt` / `CreditCard`)
- **Styles:** Tailwind CSS (utility classes), inline styles utilizing the brand's dynamic `accentColor` (from `db.settings.accentColor`).

---

## File Structure Layout (Contextual)
No new files are added. The changes are local to:
- `pages/RentCarScreen.tsx`

---

## Task Breakdown

### Task 1: Render Selected Car's Image Dynamically
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P1
- **Dependencies:** None
- **Description:** Resolve the car's image URL dynamically using the same logic as `RentalCarCard`. Add a compact card section in the modal right under or next to the title. Apply a rounded border and fixed aspect ratio.
- **INPUT:** `car` object from `RentalBookingModal` props.
- **OUTPUT:** Responsive vehicle card containing the image and specs in the modal.
- **VERIFY:** View the modal in the UI; verify the correct car image displays and has a premium layout with a rounded border and correct aspect ratio.

### Task 2: Enhance Date Picker Inputs with Calendar Icon
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P1
- **Dependencies:** None
- **Description:** Position a bright `Calendar` icon from `lucide-react` absolute-positioned inside each date picker input block. Set the icon color to the brand's `accentColor`. Add appropriate left padding to the input so text does not overlap.
- **INPUT:** Start/End date inputs in `RentalBookingModal`.
- **OUTPUT:** Inputs containing the calendar icon.
- **VERIFY:** Verify the calendar icon is visible, correctly aligned, colored with the accent color, and does not overlap the text.

### Task 3: Redesign "Include Professional Driver" Selection
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P1
- **Dependencies:** None
- **Description:** Replace the simple switch toggle with side-by-side or stacked check state cards/buttons ("Include Driver" vs "Self Drive Only") that have distinctive border/background states when active, or a highly styled toggle track.
- **INPUT:** `includeDriver` state.
- **OUTPUT:** Redesigned selection cards or track.
- **VERIFY:** Toggle the driver choice and verify that the active/inactive state change is instantly recognizable with a premium design.

### Task 4: Colorize Booking Receipt Line Items
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P1
- **Dependencies:** None
- **Description:** Add small, high-contrast, themed icons (e.g. `Calendar`/`Car` for base rent, `ShieldCheck`/`Lock` for deposit, `UserCheck` for driver fee, `Receipt`/`CreditCard` for total) with soft colorful background badges next to each row label.
- **INPUT:** Booking Receipt section in the modal.
- **OUTPUT:** Icons and badges next to receipt labels.
- **VERIFY:** Verify that the receipt has modern, colorful icon badges with appropriate spacing and matching colors.

---

## Phase X: Final Verification
- [ ] No purple/violet hex codes used.
- [ ] No generic layouts or components.
- [ ] Run `python .agent/scripts/verify_all.py .` to ensure linting and security scans pass.
- [ ] Run `npm run build` to verify there are no compilation errors.
