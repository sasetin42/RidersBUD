# Plan: Dynamic Duration Compound Input

This plan outlines the steps to replace the raw text duration input inside `ServiceForm` with a clean, dynamic compound input consisting of a numeric value field and a unit selector (Minutes, Hours, Days), with helper-based parsing and automatic synchronization back to the `estimatedTime` string representation.

---

## 🎯 Goal
Provide a premium, structured way for admins to input service durations (value + unit) that automatically parses existing string representations and seamlessly serializes them back to the database-compatible string formats (e.g. `"45 mins"`, `"1 hour"`, `"2 hours"`), preventing input errors and maintaining consistency.

---

## 🔍 Proposed Changes

### 1. Parsing Helper: `parseEstimatedTime`
Implement a utility helper inside or alongside the forms:
```typescript
interface ParsedDuration {
  value: number;
  unit: 'mins' | 'hours' | 'days';
}

export const parseEstimatedTime = (timeStr: string): ParsedDuration => {
  const fallback: ParsedDuration = { value: 30, unit: 'mins' };
  if (!timeStr) return fallback;

  // Match number and unit (case-insensitive)
  const regex = /^(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|day|days)\b/i;
  const match = timeStr.trim().match(regex);

  if (!match) return fallback;

  const value = parseInt(match[1], 10);
  const unitRaw = match[2].toLowerCase();

  let unit: 'mins' | 'hours' | 'days' = 'mins';
  if (unitRaw.startsWith('min')) {
    unit = 'mins';
  } else if (unitRaw.startsWith('hour') || unitRaw.startsWith('hr')) {
    unit = 'hours';
  } else if (unitRaw.startsWith('day')) {
    unit = 'days';
  }

  return { value, unit };
};
```

### 2. State Integration & Syncing
- Initialize two new states when the component loads (using values parsed from the initial `service?.estimatedTime` or fallback):
  - `durationValue` (number)
  - `durationUnit` (`'mins' | 'hours' | 'days'`)
- Synchronize changes reactively to the main `formData.estimatedTime` field whenever `durationValue` or `durationUnit` updates:
  - Formats output correctly based on singular/plural rules:
    - Minutes: `"{value} mins"` (standard plural/short)
    - Hours: `"{value} hour"` (singular) or `"{value} hours"` (plural)
    - Days: `"{value} day"` (singular) or `"{value} days"` (plural)

### 3. UI Markup Layout
- Replace the single `<input type="text" name="estimatedTime" ... />` with a flex container:
  - **Number Input**: width `w-2/3`, minimum `1`, integer restriction.
  - **Unit Select Selector**: width `w-1/3`, options: `Minutes`, `Hours`, `Days`.

---

## 🛠️ Task Breakdown

### Task 1: Update `ServiceForm` in `AdminCatalogScreen.tsx`
- **Agent**: `frontend-specialist`
- **Skill**: `clean-code`, `frontend-design`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**:
  - Existing `ServiceForm` component inside [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx).
- **OUTPUT**:
  - Helper function `parseEstimatedTime` defined.
  - Separate state fields for value and unit.
  - A `useEffect` or change-handler wrapper that formats and updates `formData.estimatedTime`.
  - Compact compound UI layout (number field `w-2/3` + select field `w-1/3`).
- **VERIFY**:
  - Click "Add Service" or edit an existing service.
  - Verify that an existing duration like `"2 hours"` parses correctly into a number `2` and select option `Hours`.
  - Verify that entering `1` and `Hours` produces `"1 hour"` in the payload sent to `onSave`.

### Task 2: Update `ServiceForm` in `AdminServicesScreen.tsx`
- **Agent**: `frontend-specialist`
- **Skill**: `clean-code`, `frontend-design`
- **Priority**: P0
- **Dependencies**: None (Can run in parallel with Task 1)
- **INPUT**:
  - Existing `ServiceForm` component inside [AdminServicesScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminServicesScreen.tsx).
- **OUTPUT**:
  - Identical `parseEstimatedTime` parser and reactive syncing integration.
  - Compound input layout replacing the standard text field.
- **VERIFY**:
  - Open Services Screen, open add/edit modal, and verify input fields present correct value and unit selectors.
  - Verify form saving updates catalog entries with standard formats.

---

## ✅ Done When
- [ ] Both forms (`AdminCatalogScreen.tsx` and `AdminServicesScreen.tsx`) have the new compound input fields.
- [ ] Existing non-standard strings fallback safely to `"30 mins"`.
- [ ] Formatting is correctly pluralized/singularized (e.g. `1 hour` vs `2 hours`, `1 day` vs `3 days`).
- [ ] No compilation, linting, or type errors.

---

## 🏁 Phase X: Final Verification
- [ ] Run typescript checking: `npx tsc --noEmit`
- [ ] Verify that form validations continue to block invalid entries.
