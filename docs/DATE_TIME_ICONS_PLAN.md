# Implementation Plan - Date/Time Picker Indicator Colorization

## Overview
This plan details the changes required to override the styling of the native calendar and clock input indicators in the application, ensuring that the primary brand color (`#FE7803`) is correctly applied and visible without being bleached/inverted by global webkit styles.

## Project Type
- **WEB** (React, TypeScript, Vite)

## Success Criteria
- The calendar picker indicator (date input icon) in step 2 of the booking process uses the correct brand color icon.
- The clock picker indicator (time input icon) in step 2 of the booking process uses the correct brand color icon.
- Indicators retain their intended color and are not bleached or distorted by global webkit inversion filters.

## Affected Files
1. [index.css](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/index.css) - Contains CSS override definitions for input calendar/clock picker indicators.
2. [pages/BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx) - Step 2 render method where date and time inputs are defined.

## Implementation Tasks

### Task 1: CSS Style Overrides (index.css)
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`, `frontend-design`
- **Priority**: P0
- **Dependencies**: None
- **Description**: Update the rules for `.time-picker-primary-icon::-webkit-calendar-picker-indicator` and `.date-picker-primary-icon::-webkit-calendar-picker-indicator` in [index.css](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/index.css).
  - Add `!important` to the background-image background rule for both classes.
  - Add `filter: none !important;` to both pseudo-elements to override any global Webkit dark-mode/inversion rules.
- **Verification**: 
  - Verify that the CSS syntax is correct.

### Task 2: Class Assignment (pages/BookingScreen.tsx)
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`
- **Priority**: P1
- **Dependencies**: Task 1
- **Description**: Assign the styles to the React inputs in the `renderStep2` method in [pages/BookingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/BookingScreen.tsx):
  - Append `date-picker-primary-icon` to the date input `className`.
  - Append `time-picker-primary-icon` to the time input `className`.
- **Verification**:
  - Run typescript compilation checks (`npx tsc --noEmit`) to verify no syntax or compilation errors occur.

## Phase X: Final Verification
- [ ] Run `npx tsc --noEmit` and `npm run lint` to ensure no lint/build issues.
- [ ] Start the development server using `npm run dev`.
- [ ] Open the app, navigate to step 2 of the booking process, and inspect both picker indicators to verify they display in orange (#FE7803).
