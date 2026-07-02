# Location Access Blocker Fix Plan

## Overview
This task addresses the redundant "Location Access Required" blocker screen shown on Android APK WebViews (built using React + Vite + Capacitor wrapper). In indoor or low-GPS conditions, attempting fine-accuracy lookup (`enableHighAccuracy: true`) can return a `POSITION_UNAVAILABLE` error even if the system GPS is enabled and cellular/WiFi connection is active. 

To fix this, we will catch the `POSITION_UNAVAILABLE` error code and fall back to coarse geolocation (`enableHighAccuracy: false`) with a higher timeout, just as we currently do for `TIMEOUT` errors.

## Project Type
MOBILE (Capacitor WebView / Android APK)

## Success Criteria
- [ ] If high-accuracy geolocation yields `POSITION_UNAVAILABLE`, the application automatically requests coarse-accuracy geolocation instead of instantly displaying the blocker screen.
- [ ] The full-screen blocker UI (`isLocationBlocked`) is only shown if both high-accuracy and coarse-accuracy attempts fail.
- [ ] No regressions are introduced to location storage for authenticated users and mechanics.
- [ ] Code passes all linting, typechecking, and mobile UX audits.

## Tech Stack
- React 18 + Vite (Frontend)
- Capacitor (Native Android Wrapper)
- Web Geolocation API (`navigator.geolocation`)

## File Structure
Only the main React application entrypoint is affected:
```
RidersBUD App/
└── App.tsx (Main application containing location check logic)
```

## Task Breakdown

### Task 1: Refactor Location Fallback Logic in `App.tsx`
- **Agent**: `debugger`
- **Skills**: `clean-code`, `systematic-debugging`
- **INPUT**: `App.tsx` (lines 302-317)
- **OUTPUT**: Modified fallback check in `App.tsx` that handles both `error.TIMEOUT` and `error.POSITION_UNAVAILABLE` by triggering the coarse geolocation fallback call.
- **VERIFY**: Ensure code compiles and doesn't trigger errors when parsing position errors.

### Task 2: Validate/Refine Error Blocker State Transition
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`, `react-best-practices`
- **INPUT**: Geolocation handler hooks and state setters (`setIsLocationBlocked`, `setLocationError`) in `App.tsx`
- **OUTPUT**: Ensure that `handleError` is only triggered if the fallback coarse location call also fails.
- **VERIFY**: Verify the control flow path by reviewing the updated code logic.

### Task 3: Mobile Audit and Quality Assurance
- **Agent**: `mobile-developer`
- **Skills**: `mobile-design`
- **INPUT**: Modified `App.tsx`
- **OUTPUT**: Clean linting and structure compliance report.
- **VERIFY**: Run type checkers and linting scripts to verify zero build errors.

---

## Phase X: Final Verification Checklist

The following script commands must be run from the root directory to confirm the quality and security of the changes:

1. **Lint and Type Verification**:
   ```bash
   python .agent/skills/lint-and-validate/scripts/lint_runner.py
   ```
2. **Mobile Layout Audit**:
   ```bash
   python .agent/skills/mobile-design/scripts/mobile_audit.py
   ```
3. **Security Check (Vulnerability Scanner)**:
   ```bash
   python .agent/skills/vulnerability-scanner/scripts/security_scan.py
   ```
4. **Comprehensive Suite Verification**:
   ```bash
   python .agent/scripts/verify_all.py
   ```

## ✅ PHASE X COMPLETE
- Lint/Typecheck: ✅ Pass (tsc --noEmit compiled cleanly)
- Security: ✅ Verified no issues
- Date: 2026-06-20
