# Plan: Fix Liaison Agent Selection and Flow Progression

This document outlines the detailed plan to address the Liaison Agent selection display in `pages/services/LiaisonBookingFlow.tsx` Step 5, ensure correct state updates and button enablement, and align database context types to ensure there are no TypeScript compiler errors.

---

## 1. Objectives

1. **Fix Liaison Agent Selection Display (Step 5)**:
   - Ensure the `filteredStaff` logic correctly filters agents based on the chosen LTO branch (`selectedBranchId`).
   - Fall back to all active, available agents if no agents are specific to that branch.
   - Maintain robust safety checks to handle cases where `assignedBranches` might be undefined or not an array.

2. **State Synchronization & Navigation Enablement**:
   - Ensure that selecting a liaison agent updates the `selectedLiaisonId` state.
   - Verify that updating `selectedLiaisonId` immediately satisfies `isStepValid()` for Step 5, enabling the 'Next Step' button and allowing transition to Step 6.

3. **TypeScript & Database Context Alignment**:
   - Ensure types and properties for `LiaisonStaff`, `LiaisonBranch`, and `LiaisonBooking` in `types.ts` are fully aligned with the Firestore/Database state references in `context/DatabaseContext.tsx` and `pages/services/LiaisonBookingFlow.tsx`.
   - Prevent any compilation or runtime TypeErrors.

---

## 2. Technical Analysis

### Step 5 Staff Filtering Logic
In `pages/services/LiaisonBookingFlow.tsx`:
```typescript
const filteredStaff = (() => {
    const activeStaff = (db?.liaisonStaff || staff).filter(s => s.isAvailable !== false);
    const branchSpecific = activeStaff.filter(s => s.assignedBranches && s.assignedBranches.includes(selectedBranchId));
    return branchSpecific.length > 0 ? branchSpecific : activeStaff;
})();
```
If a branch is selected, `filteredStaff` correctly retrieves branch-specific staff or falls back to all active staff. We will inspect and guarantee that:
- Any selected staff item has a valid `id` matching type `string`.
- Clicking a staff card updates state via `setSelectedLiaisonId(s.id)`.

### Step Validation (`isStepValid`)
At Step 5, `isStepValid()` evaluates:
```typescript
if (currentStep === 5) return !!selectedLiaisonId;
```
We need to ensure that the selection UI element sets `selectedLiaisonId` correctly and that the React component triggers a re-render so that the bottom navigation button's `disabled` property updates:
```typescript
disabled={!isStepValid()}
```

---

## 3. Detailed Step-by-Step Plan

### Phase 1: Verify & Adjust Liaison Selection Code
1. Inspect the agent list rendering in `pages/services/LiaisonBookingFlow.tsx` Step 5.
2. Confirm the `onClick` event on the card invokes `setSelectedLiaisonId(s.id)`.
3. Add visual selection indicators (e.g., active borders or checkmarks) using the theme's `accentColor`.

### Phase 2: Verify `isStepValid` & Next Button Interactions
1. Ensure `isStepValid()` checks `!!selectedLiaisonId` for step 5.
2. Confirm that when `isStepValid()` returns `true`, the `Next Step` button receives the correct background styling and becomes clickable.
3. Validate that `handleNext` successfully calls `saveProgress` and sets the current step to 6.

### Phase 3: Alignment of Types and Contexts
1. Cross-reference `types.ts` definitions for `LiaisonStaff`, `LiaisonBranch`, and `LiaisonBooking` with `context/DatabaseContext.tsx`.
2. Confirm that `db.liaisonStaff` and `db.liaisonBranches` exist on the `Database` interface and are typed correctly.

---

## 4. Verification & Testing Actions

- [ ] **Liaison Selection**: In the browser, navigate to Step 5, select an agent, and check that the card gains an active highlight border.
- [ ] **Next Button State**: Confirm the "Next Step" button becomes active immediately upon selecting an agent.
- [ ] **Data Progression**: Click "Next Step" and ensure Step 6 (Date/Time picker) renders correctly.
- [ ] **Type Check**: Execute `npx tsc --noEmit` to verify zero TypeScript compiler errors.
