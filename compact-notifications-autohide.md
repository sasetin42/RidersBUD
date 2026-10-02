# Plan: Compact Notification Design with Strict 3-Second Auto-Hide & Anti-Overlay

## 1. Problem Statement & User Feedback
The user provided a screenshot showing:
1. **Overlay Collision**: A local green toast ("Arrived & work started!") overlaid directly on top of the dark system notification ("Booking Status Updated").
2. **Notification Size**: The default notification design is bulky and takes up too much vertical screen space on mobile viewports.
3. **Core Requirements**:
   - **Strict 3s Auto-Hide**: All notifications must automatically disappear after the 3-second loading progress countdown.
   - **Compact Design & Reduced Size**: Slim down the notification card height, icon container, padding, and margins without sacrificing text legibility.
   - **Zero Overlaying**: Ensure no two toasts or alert pills ever overlap each other simultaneously on screen.
   - **Complete Readability**: Keep text crisp, high-contrast, perfectly legible (type badge, title, message body, action link, and close button).

---

## 2. Proposed Architectural & UI Enhancements

### Task 1: Compact UI Redesign (`components/NotificationToast.tsx`)
- **Card Sizing**: Reduce container footprint (`max-w-[360px]` on mobile, compact sleek container height ~48px–56px).
- **Layout & Padding**:
  - Tighten padding from `pt-3 pb-2.5` to `px-3 py-2`.
  - Icon container reduced from `w-10 h-10` to `w-7 h-7` (28px) with `size={14}` stroke icon.
  - Border radius refined to `rounded-xl` (`12px`) with subtle backdrop blur.
- **Typography & Complete Readability**:
  - Type badge: `text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none`.
  - Title: `text-xs font-bold text-white leading-tight line-clamp-1`.
  - Message: `text-[11px] font-medium text-gray-200 leading-snug line-clamp-2`.
  - Action link ("View >"): `text-[10px] font-bold text-emerald-400 hover:text-emerald-300`.
  - Close button: `w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-white`.

### Task 2: Strict 3-Second Auto-Hide & Progress Countdown
- **Progress Line**: Sleek 2px progress bar at the bottom with colored glow corresponding to notification type.
- **Timer Execution**:
  - Exact 3000ms duration with linear decrement to 0%.
  - Unconditional auto-hide after 3 seconds: starts exit animation (`animate-toast-out`) at 3000ms and calls `onDismiss` at 3250ms.
  - Eliminates infinite pause states so notifications never linger or get stuck.

### Task 3: Anti-Overlay & Single-Source-of-Truth Queue (`components/NotificationToasts.tsx`)
- **Single Active Toast**: Enforce strict single-toast presentation (`toastQueue[0]`).
- **Smooth Queue Transitions**: When a new notification arrives while one is displaying, it queues cleanly and displays immediately after the prior toast completes its 3-second cycle.
- **Top Placement**: Clean fixed placement at `top-3 sm:top-4 z-[9999]` with `pointer-events-none` container and `pointer-events-auto` card.
- **Audit Stray Local Toasts**: Ensure no screen (such as `MechanicJobDetailScreen`) mounts a conflicting floating top toast.

---

## 3. Verification Criteria
- [ ] Visual Inspection: Compact card dimensions, no oversized padding, no awkward wrapping.
- [ ] Text Legibility: Title, message, badge, link, and close icon are clearly visible and sharp.
- [ ] Timing: Toast and progress bar run for exactly 3 seconds, then slide out and auto-hide cleanly.
- [ ] Concurrency / Anti-Overlay: Rapidly triggering multiple notifications queues them sequentially without overlapping.
- [ ] Build & Types: `npm run typecheck` and `npm run build` pass with 0 errors.
