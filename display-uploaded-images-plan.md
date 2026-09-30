# Uploaded Documents Interactive Display & Image Preview Plan

## 1. Task Summary
The user requested:
> *"/orchestrate /plan-writing please display the uploaded image fully functional."*
> Attached screenshot: **Registration Assistance • Step 3 of 5: UPLOAD DOCUMENTS**, showing uploaded items (`OR/CR`, `VALID GOVERNMENT ISSUED ID`, `PREVIOUS REGISTRATION DOCUMENT`, `OTHER SUPPORTING FILES`) currently rendering only file names with a progress bar, lacking thumbnail image display and full preview functionality.

---

## 2. Identified Problems in Current Implementation
1. **No Image Thumbnail:** When an image (`image/*`) is selected, `LiaisonBookingFlow.tsx` reads it as a base64 DataURL, but only displays text (`file.name`, `100%`) without any visual thumbnail preview.
2. **No Interactive Full Preview:** Users cannot tap/click to inspect or view their uploaded documents (e.g., OR/CR or ID) in full size/modal.
3. **No File Type Indicator:** PDFs and images look identical; there's no visual badge for file format or file size.
4. **Summary Step Missing Previews:** Step 5 (Review Summary) only prints text bullets of file names instead of interactive visual previews.

---

## 3. Architecture & Functional Enhancements

### A. Document Upload Card (Step 3 / Step 4)
- **Image Thumbnail Preview:** If the file is an image (`type.startsWith('image/')` or `url.startsWith('data:image')`), display a crisp, rounded thumbnail with an aspect ratio preview container.
- **PDF / Document Fallback:** If PDF, show a styled PDF document icon badge with file size indicator (e.g. `2.4 MB`).
- **Interactive Lightbox / Fullscreen Modal:**
  - Clicking on the thumbnail or "View Document" button opens a full-screen glassmorphic modal with:
    - High-resolution pan/zoom image view.
    - File details (Document Title, File Name, Size, Upload Date/Status).
    - Close button (`X`), Download/Open button.
- **Actions Bar:**
  - View / Zoom icon (`Eye` or `Maximize2`).
  - Replace / Re-upload icon (`RefreshCw`).
  - Remove / Delete icon (`Trash2`).

### B. Summary & Review Step (Step 5 for RegAssist, Step 8 for General)
- Display clickable thumbnail previews alongside document labels so users can review what they uploaded before final confirmation.

---

## 4. Multi-Agent Orchestration Team

| # | Agent | Role / Domain | Responsibilities |
|---|-------|---------------|------------------|
| 1 | `project-planner` | Planning & Task Breakdown | Create `{task-slug}.md`, define acceptance criteria & user checkpoint |
| 2 | `frontend-specialist` | UI/UX & Responsive Layout | Implement thumbnail card, lightbox preview modal, Lucide icons (`Eye`, `Maximize2`, `FileText`), animation |
| 3 | `test-engineer` | Quality & Build Verification | Verify build integrity (`npm run build`), test file upload state, check edge cases (PDF vs Image, large files) |

---

## 5. Execution Steps
1. **Update Imports:** Add `Eye`, `Maximize2`, `X`, `ExternalLink`, `Download` from `lucide-react` in [`LiaisonBookingFlow.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/services/LiaisonBookingFlow.tsx).
2. **State Management:** Add `previewDocument: { title: string; url: string; name: string; type: string; size: number } | null` state.
3. **Render Thumbnail:** Enhance the uploaded state inside document map in Step 3/4 with thumbnail preview, file size formatting, and action buttons.
4. **Full-Screen Lightbox Modal:** Add responsive preview modal with backdrop blur, zoom container, and smooth entry animation.
5. **Review Step Preview:** Add thumbnail previews to the uploaded documents card in Step 5 Review Summary.
6. **Verification:** Run `npm run build` and ensure 0 errors.
