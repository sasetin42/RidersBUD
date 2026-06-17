# Logo Design Fix Plan

## Goal
Recolor the "Bud" text in the RidersBUD logo from black/dark grey to white or a bright contrasting color to ensure legibility and a premium feel on dark backgrounds.

## Project Type
WEB / MOBILE (Capacitor hybrid React application)

## Success Criteria
- The "Bud" portion of the logo text in `public/riders-logo.png` is clearly visible on dark mode backgrounds.
- The white background of the original logo remains transparent.
- Orange/bright sections of the logo are preserved without modification.
- Logo assets are updated across both web and build outputs (e.g. `public/` folder).

## Tech Stack
- Node.js
- Sharp (image processing library)

## File Structure
- `scripts/process-logo.js` (Existing logo processor script)
- `public/riders-logo.png` (Main logo asset)

## Task Breakdown

### Task 1: Update Logo Processing Script
- **Description:** Modify the script `scripts/process-logo.js` to recolor dark grey/black pixels (representing the "Bud" text) to white, while preserving transparency and the orange parts.
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** High
- **Dependencies:** None
- **INPUT:** `scripts/process-logo.js` and the source logo image.
- **OUTPUT:** Updated `scripts/process-logo.js` containing color-transformation logic for pixels with low RGB values (e.g., RGB < 80 converted to RGB 255, 255, 255).
- **VERIFY:** Check that the code changes are correctly written and use the correct thresholds.

### Task 2: Execute Logo Processing
- **Description:** Run the updated `scripts/process-logo.js` script to process the logo and output the modified `public/riders-logo.png`.
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`
- **Priority:** High
- **Dependencies:** Task 1
- **INPUT:** Source logo image and `scripts/process-logo.js`.
- **OUTPUT:** Updated `public/riders-logo.png` with recolored text.
- **VERIFY:** Verify the console output of the script execution shows success and output file is updated.

### Task 3: Build & Asset Synchronization
- **Description:** Build the application to ensure that the updated logo assets are copied over to the static and Android build assets folders.
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`
- **Priority:** Medium
- **Dependencies:** Task 2
- **INPUT:** Updated `public/riders-logo.png`.
- **OUTPUT:** Rebuilt dist assets containing the new logo.
- **VERIFY:** Run `npm run build` and check `dist/riders-logo.png` to confirm the asset matches the updated version in `public/`.

---

## Phase X: Final Verification

### 1. Visual Verification
- Open the generated `public/riders-logo.png` file to manually verify that "Bud" is white/light and clearly visible.

### 2. Automated & Compliance Verification
- [ ] Verify the application builds successfully: `npm run build`
- [ ] Rule Compliance check:
  - No purple/violet hex codes used.
  - Socratic Gate was respected.
