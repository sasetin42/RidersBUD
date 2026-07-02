# Clean Service About Details Plan

## Goal
Sanitize service description details by stripping `"Redirects to the rental page."` via regex in the UI, adding redundancy checks to prevent duplicate suffixes, and cleaning seed/mock data files.

## Affected Files
- [ServiceDetailScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/ServiceDetailScreen.tsx)
- [liveData.json](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/data/liveData.json)
- [liveData.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/data/liveData.ts)
- [mockData.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/data/mockData.ts)

## Implementation Plan

### Phase 1: String Sanitization & Redundancy Protection (UI)
- [ ] **Task 1: Add regex sanitization in `getDynamicAboutDetails`**
  - **Action**: Update `getDynamicAboutDetails` in `ServiceDetailScreen.tsx` to strip out `"Redirects to the rental page."` (case-insensitive, handling surrounding whitespace) using a regular expression.
  - **Verify**: Code compiles and `getDynamicAboutDetails` successfully sanitizes descriptions before suffix processing.
- [ ] **Task 2: Implement Redundancy Protection**
  - **Action**: In `getDynamicAboutDetails`, update the suffix conditional logic. Check if the sanitized description already contains category keywords (e.g. `rent`/`fleet`, `driver`/`hire`, `towing`/`roadside`, `brake`/`mechanic`/`repair`/`maintenance`). Append the suffix block **ONLY** if those keywords are missing from the sanitized description.
  - **Verify**: Suffix block is not appended when category keywords exist in the description.

### Phase 2: Seed Files Clean-Up
- [ ] **Task 3: Sanitize `liveData.json`**
  - **Action**: Locate the service with name `"Rent a Car"` and edit its description to remove `" Redirects to the rental page."`.
  - **Verify**: The JSON syntax remains valid and description is cleaned.
- [ ] **Task 4: Sanitize `liveData.ts`**
  - **Action**: Locate the service with name `"Rent a Car"` and edit its description to remove `" Redirects to the rental page."`.
  - **Verify**: TypeScript compiles successfully.
- [ ] **Task 5: Sanitize `mockData.ts`**
  - **Action**: Locate the service with name `"Rent a Car"` and edit its description to remove `" Redirects to the rental page."`.
  - **Verify**: TypeScript compiles successfully.

### Phase 3: Verification & Auditing
- [ ] **Task 6: Run Quality Checks**
  - **Action**: Execute linting and audit scripts to ensure no syntax errors.
  - **Verify**: The project builds successfully and the app runs without regression.
