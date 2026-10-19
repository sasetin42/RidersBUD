# Orchestration Plan: Enhance Customer Primary Vehicle Card Design

## 1. Problem Statement & User Requirements
The customer primary vehicle section on the Customer Portal Home Screen (`pages/HomeScreen.tsx`) needs to be redesigned with the following specifications:
1. **Vehicle Image as Background with Overlay**:
   - Instead of displaying a small thumbnail box on the right, use the primary vehicle image (fallback to vehicle mockup if none uploaded) as the card's backdrop image.
   - Apply a dark/gradient overlay (`backdrop-blur`, darkened gradient, or dark vignette) so all text, badges, and icons remain crystal clear with maximum contrast and readability.
   - Remove the small thumbnail box (`<div className="w-20 h-20 sm:w-24 sm:h-24 ...">`).
2. **Remove "Manage My Garage" Button & Add Upper-Right Pencil Edit Button**:
   - Remove the large bottom button `"Manage My Garage"`.
   - Add a sleek, circular or rounded pencil edit button (`<Pencil size={...} />`) at the top right of the section that navigates to `/customer-portal/my-garage` (with tooltip "Manage My Garage" / "Edit Garage").
3. **Spec Data Details Per Row (Plate No., Color, Category)**:
   - Instead of a 3-column grid (`grid grid-cols-3`), arrange the spec details cleanly **per row** (or stacked row items with plate number, color dot/name, and vehicle category) with balanced labels and values.
4. **Vehicle Active Status Button/Badge**:
   - Change `"VEHICLE ACTIVE & READY"` into `"Active"` only.
   - Include a pulse / check icon and reduce its size to a compact, refined pill.

## 2. Orchestration Agent Breakdown (3 Agents Minimum)
1. **`project-planner`**:
   - Define exact UI layout, responsive spacing, contrast requirements, and write `docs/PLAN.md`.
2. **`frontend-specialist`**:
   - Implement the new vehicle background styling with multi-stop dark gradient overlay.
   - Position the Pencil edit button at the top-right corner.
   - Re-format the spec details into clean rows (Plate No., Color, Category).
   - Render the compact "Active" status indicator with an icon.
3. **`test-engineer`**:
   - Validate TypeScript compilation (`npm run lint`), check edge cases (missing image, long make/model, missing plate/color/category), verify responsiveness and contrast.

---

## 3. Detailed Component Architecture
### Container Layout:
```tsx
<div className="relative rounded-[24px] sm:rounded-[28px] overflow-hidden border border-[#FE7803]/30 shadow-2xl animate-slideUp w-full min-h-[220px]">
  {/* Background Vehicle Image with object-cover */}
  <img src={vehicleImg} className="absolute inset-0 w-full h-full object-cover" />
  
  {/* Multi-layer Dark Overlay for high contrast */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 backdrop-blur-[2px]" />
  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/70 pointer-events-none" />

  {/* Content Layer */}
  <div className="relative z-10 p-5 sm:p-6 w-full flex flex-col justify-between">
    {/* Header with Title + Pencil Edit Button */}
    ...
    {/* Active Status Badge */}
    ...
    {/* Spec Rows: Plate No, Color, Category */}
    ...
  </div>
</div>
```
